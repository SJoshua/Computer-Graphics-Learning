// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

// use jsm instead of js - they were deprecated.
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ canvas });
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);

    // use OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 5, 0);
    controls.update();

    // create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    // create plane - to do: shader
    {
        const planeSize = 40;

        const loader = new THREE.TextureLoader();
        const texture = loader.load('images/checker.png');
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.magFilter = THREE.NearestFilter;
        const repeats = planeSize / 2;
        texture.repeat.set(repeats, repeats);

        const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
        const planeMat = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.rotation.x = Math.PI * -.5;
        scene.add(mesh);
    }

    // light to ground
    {
        const skyColor = 0xB1E1FF;  // light blue
        const groundColor = 0xB97A20;  // brownish orange
        const intensity = 1;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    // light to character
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(5, 10, 2);
        scene.add(light);
        scene.add(light.target);
    }

    // update camera
    function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
        const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
        const halfFovY = THREE.MathUtils.degToRad(camera.fov * .5);
        const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
        // compute a unit vector that points in the direction the camera is now
        // in the xz plane from the center of the box
        const direction = (new THREE.Vector3())
            .subVectors(camera.position, boxCenter)
            .multiply(new THREE.Vector3(1, 0, 1))
            .normalize();

        // move the camera to a position distance units way from the center
        // in whatever direction the camera was from the center already
        camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

        // pick some near and far values for the frustum that
        // will contain the box.
        camera.near = boxSize / 100;
        camera.far = boxSize * 100;

        camera.updateProjectionMatrix();

        // point the camera to look at the center of the box
        camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
    }

    // load character model
    {
        var root;
        var mixer;
        const inf = 1 << 20;
        const after_walk = 0.4;
        var allowMove = 0;
        var walking = false;
        var moving = false;
        var turning_left = false;
        var turning_right = false;
        var clock = new THREE.Clock();

        const gltfLoader = new GLTFLoader();
        
        gltfLoader.load('character_walk.glb', (gltf) => {
            root = gltf.scene;
            mixer = new THREE.AnimationMixer(root);
            scene.add(root);
            
            var walk_start = mixer.clipAction(gltf.animations[1]);
                walk_start.setLoop(THREE.LoopOnce);
                walk_start.clampWhenFinished = true;
            var walk = mixer.clipAction(gltf.animations[0]);
            var walk_stop = mixer.clipAction(gltf.animations[2]);
                walk_stop.setLoop(THREE.LoopOnce);
            
            function playWalkStart() {
                allowMove = inf;
                walking = true;
                moving = true;
                mixer.stopAllAction();
                walk_start.play();
            }

            function playWalk() {
                mixer.stopAllAction();
                walk.play();
            }

            function playWalkStop() {
                allowMove = after_walk;
                mixer.stopAllAction();
                walk_stop.play();
            }

            mixer.addEventListener('loop', function(e) {
                let name = e.action.getClip().name;
                allowMove = inf;
                if (name == "Walk" && !walking) playWalkStop();
            });

            mixer.addEventListener('finished', function(e) {
                let name = e.action.getClip().name;
                allowMove = inf;
                if (name == "Walk_Start") {
                    if (walking) playWalk();
                    else playWalkStop();
                } else if (name == "Walk_Stop") {
                    moving = false;
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key == 'w') {
                    if (!walking && !moving) playWalkStart();
                } else if (e.key == 'a') {
                    turning_left = true;
                } else if (e.key == 'd') {
                    turning_right = true;
                }
            }, false);

            document.addEventListener('keyup', function(e) {
                if (e.key == 'w') {
                    walking = false;
                } else if (e.key == 'a') {
                    turning_left = false;
                } else if (e.key == 'd') {
                    turning_right = false;
                }
            }, false);

            // compute the box that contains all the stuff
            // from root and below
            const box = new THREE.Box3().setFromObject(root);

            const boxSize = box.getSize(new THREE.Vector3()).length();
            const boxCenter = box.getCenter(new THREE.Vector3());

            // set the camera to frame the box
            frameArea(boxSize * 0.5, boxSize, boxCenter, camera);

            // update the Trackball controls to handle the new size
            controls.maxDistance = boxSize * 10;
            controls.target.copy(boxCenter);
            controls.update();
        });
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function render() {
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        renderer.render(scene, camera);

        var delta = clock.getDelta();

        if (turning_left) root.children[2].rotateY(delta);
        if (turning_right) root.children[2].rotateY(-delta);
        if (moving) {
            var dist = 0.4 / (16 / 30) * delta;
            if (allowMove > 0) { 
                dist = Math.min(allowMove, dist);
                allowMove -= dist;
                root.children[2].translateZ(dist);
            }            
        }
        if (mixer) mixer.update(delta);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
