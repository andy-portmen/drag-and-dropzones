zip -9 -r ddzones.xpi chrome defaults install.rdf chrome.manifest license.txt
wget --post-file=ddzones.xpi http://localhost:8888/
