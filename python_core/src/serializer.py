
import json
import struct
from typing import Dict, List, Any

class BastionSerializer:
    """
    Enforces 'Deterministic-but-Unique' output signatures.
    """

    ORDER_ROOT = [
        "version", "entropy", "flags", "lastModified", 
        "locker", "contacts", "notes", "configs"
    ]

    ORDER_CONFIG = [
        "id", "name", "username", "category", "version", 
        "length", "useSymbols", "customPassword", "breachStats", "compromised",
        "createdAt", "updatedAt", "usageCount", "sortOrder"
    ]

    ORDER_NOTE = ["id", "updatedAt", "title", "content"]
    ORDER_CONTACT = ["id", "updatedAt", "name", "email", "phone", "address", "notes"]
    ORDER_RESONANCE = ["id", "timestamp", "label", "size", "mime", "key", "hash", "embedded"]

    @staticmethod
    def _reorder(obj: Dict[str, Any], order: List[str]) -> Dict[str, Any]:
        if not isinstance(obj, dict): return obj
        out = {}
        for key in order:
            if key in obj: out[key] = obj[key]
        remaining = sorted([k for k in obj.keys() if k not in order])
        for key in remaining: out[key] = obj[key]
        return out

    @classmethod
    def serialize(cls, state: Any) -> str:
        if hasattr(state, '__dict__'): state_dict = state.__dict__
        elif isinstance(state, dict): state_dict = state
        else: raise ValueError("State must be a dict or dataclass")

        ordered = cls._reorder(state_dict, cls.ORDER_ROOT)

        if 'configs' in ordered and isinstance(ordered['configs'], list):
            ordered['configs'] = [cls._reorder(c, cls.ORDER_CONFIG) for c in ordered['configs']]
        if 'notes' in ordered and isinstance(ordered['notes'], list):
            ordered['notes'] = [cls._reorder(n, cls.ORDER_NOTE) for n in ordered['notes']]
        if 'contacts' in ordered and isinstance(ordered['contacts'], list):
            ordered['contacts'] = [cls._reorder(c, cls.ORDER_CONTACT) for c in ordered['contacts']]
        if 'locker' in ordered and isinstance(ordered['locker'], list):
            ordered['locker'] = [cls._reorder(l, cls.ORDER_RESONANCE) for l in ordered['locker']]

        return json.dumps(ordered, separators=(',', ':'))

    @staticmethod
    def frame(json_str: str) -> bytes:
        """
        Wraps JSON with 4-byte Length Header + 0x00 Padding to 64-byte alignment.
        """
        data_bytes = json_str.encode('utf-8')
        length = len(data_bytes)
        
        # 1. Header
        header = struct.pack('<I', length)
        
        # 2. Padding Calc
        total_raw = 4 + length
        remainder = total_raw % 64
        padding_needed = 0 if remainder == 0 else 64 - remainder
        padding = b'\x00' * padding_needed
        
        return header + data_bytes + padding

    @staticmethod
    def deframe(data: bytes) -> str:
        if len(data) < 4: return data.decode('utf-8')

        try:
            # Read Length (Little Endian)
            claimed_len = struct.unpack('<I', data[:4])[0]
            
            # Check if claimed length fits in buffer (allowing for padding)
            if claimed_len <= len(data) - 4:
                # Valid Bastion Frame: Slice exact payload
                return data[4:4+claimed_len].decode('utf-8')
        except:
            pass
            
        # Fallback
        return data.decode('utf-8')
