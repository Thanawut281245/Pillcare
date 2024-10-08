import sys
from setuptools import setup

requirements = [
    'Flask==2.0.1',
    'gunicorn==20.1.0',
]

if sys.platform == 'win32':
    requirements.append('pywin32==306')

setup(
    name='my-app',
    install_requires=requirements,
)
