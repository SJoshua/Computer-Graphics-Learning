// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';
// import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'https://threejs.org/examples/jsm/exporters/GLTFExporter.js';

var link = document.createElement('a');
link.style.display = 'none';
document.body.appendChild(link);

function downloadJSON(obj) {
    link.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], {type: 'text/plain'}));
    link.download = "scene.gltf";
    link.click();
}

function main() {
    var vrmLoader = new VRMLoader();
    var gltfExporter = new GLTFExporter();
    vrmLoader.load('character.vrm', (vrm) => {
        gltfExporter.parse(vrm.scene, function(gltf) {
            console.log(gltf);
            downloadJSON(gltf);
        });
    });
}

main();
