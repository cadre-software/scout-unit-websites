"""Verify a fresh maintainer release, before and after rebuilding its HTML."""
import hashlib
import json
import os
from pathlib import Path

root = Path('.')
release = json.loads((root / 'release.json').read_text())
expected = release['files']
actual = set()
for directory, dirs, files in os.walk(root):
    if Path(directory) == root:
        dirs[:] = [name for name in dirs if name not in {'.git', 'node_modules', 'test-results'}]
    for name in dirs:
        assert not (Path(directory) / name).is_symlink(), 'Release directory is a symlink'
    for name in files:
        file = Path(directory) / name
        assert not file.is_symlink(), 'Release file is a symlink'
        actual.add(file.as_posix().removeprefix('./'))
assert actual == set(expected) | {'release.json'}, 'Release has missing or unlisted files'
for name, digest in expected.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, 'Release bytes differ: ' + name
print('PASS standalone release inventory: exact file set and checksums')
