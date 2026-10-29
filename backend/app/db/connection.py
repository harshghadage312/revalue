import copy
import re
import threading
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import pymongo
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings
from app.core.logging import logger


class MemoryCursor:
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items
        self._skip = 0
        self._limit = None

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, str):
            key = key_or_list
            reverse = direction == -1
            self._items.sort(key=lambda x: (x.get(key) is None, x.get(key)), reverse=reverse)
        elif isinstance(key_or_list, list):
            for k, d in reversed(key_or_list):
                reverse = d == -1
                self._items.sort(key=lambda x: (x.get(k) is None, x.get(k)), reverse=reverse)
        return self

    def skip(self, count: int):
        self._skip = max(0, count)
        return self

    def limit(self, count: int):
        self._limit = count
        return self

    def __iter__(self):
        start = self._skip
        end = start + self._limit if self._limit is not None else len(self._items)
        return iter(copy.deepcopy(self._items[start:end]))

    def to_list(self) -> List[Dict[str, Any]]:
        return list(self)


class MemoryCollection:
    """Thread-safe in-memory MongoDB-compatible collection for local dev and isolated tests."""

    def __init__(self, name: str):
        self.name = name
        self._docs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()
        self._indexes: Dict[str, Dict[str, Any]] = {}

    def _matches_filter(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or":
                if not any(self._matches_filter(doc, subq) for subq in v):
                    return False
                continue
            if k == "$and":
                if not all(self._matches_filter(doc, subq) for subq in v):
                    return False
                continue

            if "." in k:
                parts = k.split(".")
                doc_val = doc
                for p in parts:
                    if isinstance(doc_val, dict):
                        doc_val = doc_val.get(p)
                    else:
                        doc_val = None
                        break
            else:
                doc_val = doc.get(k)
            if isinstance(v, dict):
                for op, op_val in v.items():
                    if op == "$eq" and doc_val != op_val:
                        return False
                    elif op == "$ne" and doc_val == op_val:
                        return False
                    elif op == "$in" and doc_val not in op_val:
                        return False
                    elif op == "$nin" and doc_val in op_val:
                        return False
                    elif op == "$gt" and (doc_val is None or doc_val <= op_val):
                        return False
                    elif op == "$gte" and (doc_val is None or doc_val < op_val):
                        return False
                    elif op == "$lt" and (doc_val is None or doc_val >= op_val):
                        return False
                    elif op == "$lte" and (doc_val is None or doc_val > op_val):
                        return False
                    elif op == "$regex":
                        pattern = re.compile(op_val, re.IGNORECASE)
                        if not pattern.search(str(doc_val or "")):
                            return False
            elif doc_val != v:
                return False
        return True

    def find_one(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        query = query or {}
        with self._lock:
            for doc in self._docs.values():
                if self._matches_filter(doc, query):
                    res = copy.deepcopy(doc)
                    if projection and projection.get("_id") == 0 and "_id" in res:
                        del res["_id"]
                    return res
        return None

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> MemoryCursor:
        query = query or {}
        with self._lock:
            matched = [doc for doc in self._docs.values() if self._matches_filter(doc, query)]
            return MemoryCursor(matched)

    def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        query = query or {}
        with self._lock:
            return sum(1 for doc in self._docs.values() if self._matches_filter(doc, query))

    def insert_one(self, doc: Dict[str, Any]):
        with self._lock:
            doc_copy = copy.deepcopy(doc)
            _id = str(doc_copy.get("_id", doc_copy.get("id", len(self._docs) + 1)))
            doc_copy["_id"] = _id

            # Enforce unique index constraints
            for idx_name, idx_spec in self._indexes.items():
                if idx_spec.get("unique"):
                    keys = idx_spec["keys"]
                    filter_q = {k: doc_copy.get(k) for k in keys if doc_copy.get(k) is not None}
                    if filter_q and self.find_one(filter_q):
                        raise pymongo.errors.DuplicateKeyError(f"E11000 duplicate key error in index {idx_name}")

            self._docs[_id] = doc_copy
            class InsertResult:
                inserted_id = _id
            return InsertResult()

    def insert_many(self, docs: List[Dict[str, Any]]):
        with self._lock:
            ids = []
            for doc in docs:
                res = self.insert_one(doc)
                ids.append(res.inserted_id)
            class InsertManyResult:
                inserted_ids = ids
            return InsertManyResult()

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        with self._lock:
            target = None
            for doc in self._docs.values():
                if self._matches_filter(doc, query):
                    target = doc
                    break

            class UpdateResult:
                matched_count = 0
                modified_count = 0

            res = UpdateResult()
            if target:
                res.matched_count = 1
                if "$set" in update:
                    for key, val in update["$set"].items():
                        if "." in key:
                            parts = key.split(".")
                            curr = target
                            for p in parts[:-1]:
                                if p not in curr or not isinstance(curr[p], dict):
                                    curr[p] = {}
                                curr = curr[p]
                            curr[parts[-1]] = copy.deepcopy(val)
                        else:
                            target[key] = copy.deepcopy(val)
                    res.modified_count = 1
                if "$unset" in update:
                    for k in update["$unset"]:
                        if "." in k:
                            parts = k.split(".")
                            curr = target
                            for p in parts[:-1]:
                                if isinstance(curr, dict) and p in curr:
                                    curr = curr[p]
                                else:
                                    curr = None
                                    break
                            if isinstance(curr, dict):
                                curr.pop(parts[-1], None)
                        else:
                            target.pop(k, None)
                    res.modified_count = 1
                if "$inc" in update:
                    for k, val in update["$inc"].items():
                        target[k] = target.get(k, 0) + val
                    res.modified_count = 1
                if "$push" in update:
                    for k, val in update["$push"].items():
                        if k not in target or not isinstance(target[k], list):
                            target[k] = []
                        if isinstance(val, dict) and "$each" in val:
                            target[k].extend(copy.deepcopy(val["$each"]))
                        else:
                            target[k].append(copy.deepcopy(val))
                    res.modified_count = 1
            elif upsert:
                new_doc = copy.deepcopy(query)
                if "$set" in update:
                    for key, val in update["$set"].items():
                        if "." in key:
                            parts = key.split(".")
                            curr = new_doc
                            for p in parts[:-1]:
                                if p not in curr or not isinstance(curr[p], dict):
                                    curr[p] = {}
                                curr = curr[p]
                            curr[parts[-1]] = copy.deepcopy(val)
                        else:
                            new_doc[key] = copy.deepcopy(val)
                self.insert_one(new_doc)
                res.modified_count = 1
            return res

    def update_many(self, query: Dict[str, Any], update: Dict[str, Any]):
        with self._lock:
            modified = 0
            for doc in self._docs.values():
                if self._matches_filter(doc, query):
                    if "$set" in update:
                        for key, val in update["$set"].items():
                            if "." in key:
                                parts = key.split(".")
                                curr = doc
                                for p in parts[:-1]:
                                    if p not in curr or not isinstance(curr[p], dict):
                                        curr[p] = {}
                                    curr = curr[p]
                                curr[parts[-1]] = copy.deepcopy(val)
                            else:
                                doc[key] = copy.deepcopy(val)
                        modified += 1
            class Result:
                modified_count = modified
            return Result()

    def delete_one(self, query: Dict[str, Any]):
        with self._lock:
            for k, doc in list(self._docs.items()):
                if self._matches_filter(doc, query):
                    del self._docs[k]
                    class Result:
                        deleted_count = 1
                    return Result()
            class Result:
                deleted_count = 0
            return Result()

    def delete_many(self, query: Dict[str, Any]):
        with self._lock:
            count = 0
            for k, doc in list(self._docs.items()):
                if self._matches_filter(doc, query):
                    del self._docs[k]
                    count += 1
            class Result:
                deleted_count = count
            return Result()

    def create_index(self, keys, unique: bool = False, name: Optional[str] = None, **kwargs):
        with self._lock:
            if isinstance(keys, str):
                key_list = [keys]
            elif isinstance(keys, list):
                key_list = [k[0] if isinstance(k, tuple) else k for k in keys]
            else:
                key_list = ["idx"]
            idx_name = name or "_".join(key_list)
            self._indexes[idx_name] = {"keys": key_list, "unique": unique}
            return idx_name


class MemoryDatabase:
    """In-memory database proxy providing isolated collection access."""
    def __init__(self, name: str = "revalue_db"):
        self.name = name
        self._collections: Dict[str, MemoryCollection] = {}
        self._lock = threading.Lock()

    def __getitem__(self, name: str) -> MemoryCollection:
        with self._lock:
            if name not in self._collections:
                self._collections[name] = MemoryCollection(name)
            return self._collections[name]

    def __getattr__(self, name: str) -> MemoryCollection:
        if name.startswith("_"):
            raise AttributeError(name)
        return self[name]

    def get_collection(self, name: str) -> MemoryCollection:
        return self[name]

    def command(self, cmd: str, *args, **kwargs) -> Dict[str, Any]:
        return {"ok": 1.0}


class DatabaseManager:
    _instance = None
    _client: Optional[MongoClient] = None
    _db = None
    _is_memory: bool = False

    @classmethod
    def get_db(cls):
        if cls._db is None:
            cls.connect()
        return cls._db

    @classmethod
    def is_memory(cls) -> bool:
        return cls._is_memory

    @classmethod
    def connect(cls, force_memory: bool = False):
        if force_memory:
            logger.info("Explicitly using in-memory mock database")
            cls._db = MemoryDatabase(settings.MONGODB_DB_NAME)
            cls._is_memory = True
            return cls._db

        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI} (db: {settings.MONGODB_DB_NAME})...")
            client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
                connectTimeoutMS=settings.MONGODB_TIMEOUT_MS,
            )
            # Verify connectivity
            client.admin.command('ping')
            cls._client = client
            cls._db = client[settings.MONGODB_DB_NAME]
            cls._is_memory = False
            logger.info("Connected to live MongoDB instance successfully.")
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            if settings.ENVIRONMENT == "production":
                logger.critical(f"FATAL: Live MongoDB connection failed in PRODUCTION mode: {e}")
                raise RuntimeError(
                    f"FATAL: Live MongoDB connection failed in PRODUCTION mode: {e}. "
                    "In-memory fallback is strictly disabled in production."
                ) from e
            logger.warning(
                f"Live MongoDB not reachable ({str(e)}). Falling back to thread-safe in-memory database for development/testing."
            )
            cls._db = MemoryDatabase(settings.MONGODB_DB_NAME)
            cls._is_memory = True

        return cls._db

    @classmethod
    def close(cls):
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None
            logger.info("MongoDB connection closed.")


def get_db():
    return DatabaseManager.get_db()
