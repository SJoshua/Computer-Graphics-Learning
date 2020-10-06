// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

// use jsm instead of js - they were deprecated.
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

// glb : binary format
// gltf: json format
// vrm : extended-gltf

function translate(clip, bones) {
    var arr = [];
    for (var i = 0; i < 1; i++) {
        arr.push(bones[i].node);
    }
    arr.sort();
    var new_tracks = [];
    for (var i = 0; i < 1; i++) {
        for (var j = 0; j < 3; j++) {
            new_tracks.push(clip.tracks[i * 3 + j]);
        }
    }
    return new_tracks;
}

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
        var mixer;
        var clock = new THREE.Clock();

        const gltfLoader = new GLTFLoader();
        const vrmLoader = new VRMLoader();
        
        gltfLoader.load('char_with_motion.gltf', (gltf) => {
            console.log(gltf);
            var animation_walk = gltf.animations[0];
            animation_walk.tracks = animation_walk.tracks.filter(x =>
                [
                    "Hips",
                    // "Spine",
                    // "Chest",
                    // "Neck",
                    // "Head",
                    // "RightEye",
                    // "LeftEye",
                    // "breastR",
                    // "ShoulderR",
                    "Upper_ArmR",
                    "Lower_ArmR",
                    // "HandR",
                    // "Little_ProximalR",
                    // "Little_IntermediateR",
                    // "Little_DistalR",
                    // "Ring_ProximalR",
                    // "Ring_IntermediateR",
                    // "Ring_DistalR",
                    // "Thumb_ProximalR",
                    // "Thumb_IntermediateR",
                    // "Thumb_DistalR",
                    // "Index_ProximalR",
                    // "Index_IntermediateR",
                    // "Index_DistalR",
                    // "Middle_ProximalR",
                    // "Middle_IntermediateR",
                    // "Middle_DistalR",
                    // "breastL",
                    // "ShoulderL",
                    "Upper_ArmL",
                    "Lower_ArmL",
                    // "HandL",
                    // "Index_ProximalL",
                    // "Index_IntermediateL",
                    // "Index_DistalL",
                    // "Ring_ProximalL",
                    // "Ring_IntermediateL",
                    // "Ring_DistalL",
                    // "Little_ProximalL",
                    // "Little_IntermediateL",
                    // "Little_DistalL",
                    // "Thumb_ProximalL",
                    // "Thumb_IntermediateL",
                    // "Thumb_DistalL",
                    // "Middle_ProximalL",
                    // "Middle_IntermediateL",
                    // "Middle_DistalL",
                    "Upper_LegR",
                    "Lower_LegR",
                    // "FootR",
                    // "ToesR",
                    "Upper_LegL",
                    "Lower_LegL",
                    // "FootL",
                    // "ToesL"
                ]
                    .indexOf(x.name.split(".")[0]) != -1)
                    .filter(x => (x.name.split(".")[1] == "quaternion" || x.name == "Hips.position"))

            animation_walk.tracks.forEach(x => {
                if (x.name == "Hips.quaternion") {
                    for (let i = 0; i < x.times.length; i++) {
                        let a = x.values[i * 4 + 0]
                        let b = x.values[i * 4 + 1]
                        let c = x.values[i * 4 + 2]
                        let d = x.values[i * 4 + 3]
                        //bd-ac, bd-ca, db-ac, db-ca
                        x.values[i * 4 + 0] = b
                        x.values[i * 4 + 1] = a
                        x.values[i * 4 + 2] = -d
                        x.values[i * 4 + 3] = c
                    }
                } else if (x.name == "FootL.quaternion" || x.name == "FootR.quaternion" ) {
                    
                } else if (x.name != "Hips.position") {
                    for (let i = 0; i < x.times.length; i++) {
                        let a = x.values[i * 4 + 0]
                        let b = x.values[i * 4 + 1]
                        let c = x.values[i * 4 + 2]
                        let d = x.values[i * 4 + 3]
                        x.values[i * 4 + 0] = c
                        x.values[i * 4 + 1] = b
                        x.values[i * 4 + 2] = a
                        x.values[i * 4 + 3] = -d
                    }
                }
            })

            vrmLoader.load('character.vrm', (vrm) => {
                console.log(vrm);
                const root = vrm.scene;
    
                mixer = new THREE.AnimationMixer(root);
                // var bones = vrm.userData.gltfExtensions.VRM.humanoid.humanBones;
                // animation_walk.tracks = translate(animation_walk, bones);
                console.log(animation_walk);
                
                var action = mixer.clipAction(animation_walk);
                action.play();
    
                scene.add(root);
    
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

        if (mixer) mixer.update(clock.getDelta());

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
