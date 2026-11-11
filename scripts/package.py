#!/usr/bin/env python3
"""Validate and package only installable extension files, with release notes."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def build(tag=None):
    source = ROOT / 'extension'
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    version = manifest['version']
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Manifest version must use X.Y.Z')
    if tag and tag != f'v{version}':
        raise ValueError(f'Tag {tag} does not match manifest v{version}')
    if manifest['manifest_version'] != 3:
        raise ValueError('Manifest V3 required')

    required = [manifest['action']['default_popup'], manifest['background']['service_worker']]
    required += list(manifest.get('icons', {}).values())
    required += list(manifest['action'].get('default_icon', {}).values())
    for entry in manifest['content_scripts']:
        required += entry.get('js', []) + entry.get('css', [])
    for filename in required:
        target = (source / filename).resolve()
        if not target.is_relative_to(source.resolve()) or not target.is_file():
            raise ValueError(f'Missing or unsafe manifest resource: {filename}')

    changelog = (ROOT / 'CHANGELOG.md').read_text(encoding='utf-8')
    match = re.search(r'^## \[' + re.escape(version) + r'\][^\n]*\n(.*?)(?=^## |\Z)', changelog, re.M | re.S)
    if not match:
        raise ValueError(f'CHANGELOG missing [{version}] section')
    notes = match.group(1).strip() + '\n'
    output = ROOT / 'dist'
    output.mkdir(exist_ok=True)
    filenames = sorted(path for path in source.rglob('*') if path.is_file() and path.suffix in {'.json', '.js', '.css', '.html', '.png'})
    zip_path = output / f'vyro-{version}.zip'
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as archive:
        for filename in filenames:
            entry = zipfile.ZipInfo('vyro/' + filename.relative_to(source).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, filename.read_bytes())
        entry = zipfile.ZipInfo('vyro/INSTALL.txt', date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o100644 << 16
        archive.writestr(entry, 'VYRO ' + version + '\n\n1. Open chrome://extensions\n2. Enable Developer mode\n3. Load unpacked -> choose this vyro folder\n4. Reload YouTube tabs\n\nGuide: https://github.com/hdieuhuy/VYRO#readme\nUpdates: https://github.com/hdieuhuy/VYRO/releases/latest\n')
    with zipfile.ZipFile(zip_path) as archive:
        if archive.testzip() is not None:
            raise ValueError('Corrupted ZIP')
        if 'vyro/manifest.json' not in archive.namelist():
            raise ValueError('ZIP is missing manifest')
    latest_path = output / 'vyro.zip'
    latest_path.write_bytes(zip_path.read_bytes())
    checksums = ''.join(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n' for path in [latest_path, zip_path])
    (output / 'SHA256SUMS.txt').write_text(checksums, encoding='utf-8')
    (output / 'release-notes.md').write_text(notes, encoding='utf-8')
    print(f'Validated VYRO {version}: {len(filenames)} extension files; ZIPs and SHA-256 ready in dist/')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--tag', help='Require a matching vX.Y.Z tag')
    build(parser.parse_args().tag)
