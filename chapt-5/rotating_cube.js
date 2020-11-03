// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

function main() {
    /**
     * @type {Array} functions to be called in each animation frame
     */
    let updates = [];

    function register(func) {
        updates.push(func);
    }

    // create loader
    const loader = new THREE.TextureLoader();

    // create renderer
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: canvas
    });
    // renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.GammaEncoding;

    // create camera
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(-4, 4, 4);
    register(function () {
        camera.updateProjectionMatrix();
    });

    // create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    // enable OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controls.target.set(0, 3, 0);
    controls.update();

    // enable stats monitor
    {
        const stats = new Stats();
        document.querySelector("#stats").appendChild(stats.dom);
        register(function () {
            stats.update();
        });
    }

    // create plane
    const planeSize = 20;
    {
        const floorGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
        const floorMat = new THREE.MeshStandardMaterial({
            roughness: 0.8,
            color: 0xffffff,
            metalness: 0.2,
            bumpScale: 0.0005
        });
        loader.load("textures/hardwood_diffuse.jpg", function (map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set(10, 24);
            map.encoding = THREE.sRGBEncoding;
            floorMat.map = map;
            floorMat.needsUpdate = true;

        });
        loader.load("textures/hardwood_bump.jpg", function (map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set(10, 24);
            floorMat.bumpMap = map;
            floorMat.needsUpdate = true;
        });
        loader.load("textures/hardwood_roughness.jpg", function (map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set(10, 24);
            floorMat.roughnessMap = map;
            floorMat.needsUpdate = true;
        });

        const mesh = new THREE.Mesh(floorGeo, floorMat);
        mesh.rotation.x = Math.PI * -.5;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }


    // Add Hemisphere Light
    {
        const skyColor = 0xddeeff;  // light blue
        const groundColor = 0x0f0e0d;  // brownish orange
        const intensity = 0.2;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    // Add Bulb Light
    {
        function addBulbLight(x, y, z) {
            const bulbGeometry = new THREE.SphereBufferGeometry(0.02, 16, 8);
            const bulbLight = new THREE.PointLight(0xffee88, 5, 3, 2);
            // High quality shadow
            bulbLight.shadow.mapSize.width = 1024;
            bulbLight.shadow.mapSize.height = 1024;
            const bulbMat = new THREE.MeshStandardMaterial({
                emissive: 0xffffee,
                emissiveIntensity: 1,
                color: 0x000000
            });

            bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
            bulbLight.position.set(x, y, z);
            bulbLight.castShadow = true;
            bulbLight.shadow.bias = -0.00000001;
            scene.add(bulbLight);
        }
        addBulbLight(0.8, 4, 0);
        addBulbLight(-0.8, 4, -0.8);
        addBulbLight(0, 4, 0.8);
    }

    // Add box
    {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load("box.glb", (gltf) => {
            const root = gltf.scene;
            root.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            root.translateY(2);
            scene.add(root);
        });
    }

    // Add cube 
    {
        const cubeMat = new THREE.MeshStandardMaterial({
            roughness: 0.7,
            color: 0xffffff,
            bumpScale: 0.002,
            metalness: 0.2
        });
        loader.load("textures/brick_diffuse.jpg", function (map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set(1, 1);
            map.encoding = THREE.sRGBEncoding;
            cubeMat.map = map;
            cubeMat.needsUpdate = true;
        });
        loader.load("textures/brick_bump.jpg", function (map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set(1, 1);
            cubeMat.bumpMap = map;
            cubeMat.needsUpdate = true;
        });
        loader.load("textures/brick_roughness.jpg", function (map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 4;
            map.repeat.set(1, 1);
            cubeMat.roughnessMap = map;
            cubeMat.needsUpdate = true;
        });

        const boxGeometry = new THREE.BoxBufferGeometry(0.7, 0.7, 0.7);
        const boxMesh = new THREE.Mesh(boxGeometry, cubeMat);
        boxMesh.position.set(0, 3.5, 0);
        boxMesh.castShadow = true;

        scene.add(boxMesh);

        const clock = new THREE.Clock();

        register(function() {
            const delta = clock.getDelta();
            boxMesh.rotateX(delta);
            boxMesh.rotateY(delta);
            boxMesh.rotateZ(delta);
        });
    }

    /**
     * Resize renderer.
     * @param {renderer} renderer 
     */
    function resizeRendererToDisplaySize(renderer) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    register(function () {
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }
    });

    /**
     * Call registered functions with time.
     * @param {number} time 
     */
    function update(time) {
        for (let i = 0; i < updates.length; i++) {
            updates[i](time);
        }
    }

    /**
     * Render the scene @ 60 fps.
     * @param {number} time 
     */
    function render(time) {
        update(time);

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
