// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';

function main() {
    /**
     * @type {Array} functions to be called in each animation frame
     */
    let updates = [];
    
    function register(func) {
        updates.push(func);
    }

    // create renderer
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas 
    });				
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // renderer.outputEncoding = THREE.GammaEncoding;

    // create camera
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(-4, 2, 4);
    register(function() {
        camera.updateProjectionMatrix();
    });

    // create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    // enable OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.minDistance = 0.2;
    controls.maxDistance = 5;
    controls.target.set(0, 5, 0);
    controls.update();

    // enable stats monitor
    {
        const stats = new Stats();
        document.querySelector("#stats").appendChild(stats.dom);
        register(function() {
            stats.update();
        });
    }

    // create plane
    const planeSize = 20;
    {
        const loader = new THREE.TextureLoader();

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

    // Add Directional Light
    {
        const color = 0x66CCFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-20, 10, -20);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        // light.shadow.camera.top = 20;
        // light.shadow.camera.bottom = -20;
        // light.shadow.camera.left = -20;
        // light.shadow.camera.right = 20;
        // light.shadow.camera.near = 0.1;
        // light.shadow.camera.far = 100;
        let target = new THREE.Object3D();
        target.position.set(-10, 0, -10);
        scene.add(light);
        scene.add(target);
    }

    // Add Bulb Light
    {
        const bulbGeometry = new THREE.SphereBufferGeometry(0.02, 16, 8);
        const bulbLight = new THREE.PointLight(0xffee88, 10, 100, 2);
        // High quality shadow
        bulbLight.shadow.mapSize.width = 2048;
        bulbLight.shadow.mapSize.height = 2048;
        console.log(bulbLight);
        const bulbMat = new THREE.MeshStandardMaterial({
            emissive: 0xffffee,
            emissiveIntensity: 1,
            color: 0x000000
        });

        bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
        bulbLight.position.set(0, 3, 0);
        bulbLight.castShadow = true;
        scene.add(bulbLight);
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
        const gltfLoader = new GLTFLoader();

        // const vrmLoader = new VRMLoader();
        // vrmLoader.load('character.vrm', (vrm) => {
        //     console.log(vrm);
        //     scene.add(vrm.scene);
        // });

        gltfLoader.load('character_walk.glb', (gltf) => {
            const inf = 1 << 20;
            const after_walk = 0.4;
            const turning_speed = 2;
            const moving_speed = 2;
            let allowMove = 0;
            let walking = false;
            let moving = false;
            let turning_left = false;
            let turning_right = false;
            let locking = true;

            const root = gltf.scene;
            
            const clock = new THREE.Clock();

            // replace default material with shader material
            root.traverse(function(child) {
                if (child.isMesh) {
                    console.log(child);
                    const uniforms = {
                        iResolution: { value: new THREE.Vector2() },
                        iTexture: { value: null }
                    };  
                    uniforms.iTexture.value = child.material.emissiveMap;
                    register(function(time) {
                        uniforms.iResolution.value.set(canvas.width, canvas.height); 
                    });
                    let shader_material = new THREE.ShaderMaterial({
                        uniforms: THREE.UniformsUtils.merge([
                            THREE.UniformsLib.common,
                            THREE.UniformsLib.envmap,
                            THREE.UniformsLib.aomap,
                            THREE.UniformsLib.lightmap,
                            THREE.UniformsLib.emissivemap,
                            THREE.UniformsLib.bumpmap,
                            THREE.UniformsLib.normalmap,
                            THREE.UniformsLib.displacementmap,
                            THREE.UniformsLib.roughnessmap,
                            THREE.UniformsLib.metalnessmap,
                            THREE.UniformsLib.fog,
                            THREE.UniformsLib.lights,
                            THREE.UniformsLib.shadowmap,
                            uniforms,
                            {
                                emissive: { value: new THREE.Color( 0x000000 ) },
                                roughness: { value: 1.0 },
                                metalness: { value: 0.0 },
                                envMapIntensity: { value: 1 } // temporary
                            }
                        ]),
                        vertexShader: [
                            "uniform float offset;",
                            "varying vec2 vUv;",
                            THREE.ShaderChunk["common"],
                            THREE.ShaderChunk["skinning_pars_vertex"], //skinning vertex parser
                            THREE.ShaderChunk["light_pars_begin"],
                            "void main() {",
                                "vUv = uv;",
                                "vec3 transformed = vec3(position + normal * offset);",
                                THREE.ShaderChunk["skinbase_vertex"],
                                THREE.ShaderChunk["skinning_vertex"],
                                THREE.ShaderChunk["project_vertex"],
                            "}"
                        ].join("\n"),
                        fragmentShader: [
                            "uniform sampler2D iTexture;",
                            "varying vec2 vUv;",
                            THREE.ShaderChunk["lights_pars_begin"],
                            "void main(void) {",
                                "gl_FragColor = texture2D(iTexture, vUv);",
                                // THREE.ShaderChunk["lights_fragment_begin"],
                                // THREE.ShaderChunk["lights_fragment_maps"],
                                // THREE.ShaderChunk["lights_fragment_end"],
                            "}",
                        ].join("\n"),
                        skinning: true,
                        lights: true
                    });
                    child.castShadow = true;
                    let anotherMaterial = child.material;
                    console.log("Generated by Loader", anotherMaterial);
                    let yetAnotherMaterial = THREE.ShaderLib["physical"];
                    console.log("Physical", yetAnotherMaterial);
                    // yetAnotherMaterial.emissiveMap = child.material.emissiveMap;
                    // child.material = shader_material;
                    console.log("Current", child);
                }
            });
            
            const character = root.children[2];
            character.position.set(0, 0, 0);
            register(function() {
                if (locking) {
                    controls.target.set(
                        character.position.x,
                        character.position.y + 1,
                        character.position.z
                    );
                    controls.update();
                }
            });
            scene.add(root);
            
            const mixer = new THREE.AnimationMixer(root);

            const walk_start = mixer.clipAction(gltf.animations[1]);
            walk_start.setLoop(THREE.LoopOnce);
            walk_start.timeScale = moving_speed;
            walk_start.clampWhenFinished = true;

            const walk = mixer.clipAction(gltf.animations[0]);
            walk.timeScale = moving_speed;

            const walk_stop = mixer.clipAction(gltf.animations[2]);
            walk_stop.setLoop(THREE.LoopOnce);
            walk_stop.timeScale = moving_speed;

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
                    if (!walking) {
                        if (!moving) playWalkStart();
                        else walking = true;
                    } 
                } else if (e.key == 'a') {
                    turning_left = true;
                } else if (e.key == 'd') {
                    turning_right = true;
                } else if (e.key == 'q') {
                    if (controls.maxDistance > 1) {
                        controls.maxDistance -= 1;
                    }
                } else if (e.key == 'e') {
                    controls.maxDistance += 1;
                } else if (e.key == 's') {
                    locking = !locking;
                    if (locking) {
                        controls.maxDistance = 5;
                    } else {
                        controls.maxDistance = 100;
                    }
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

            /**
             * Check if character's position available.
             */
            function isCrashed() {
                return false;
            }

            register(function(time) {
                const delta = clock.getDelta();

                if (turning_left) character.rotateY(delta * turning_speed);
                if (turning_right) character.rotateY(-delta * turning_speed);
                if (moving) {
                    let dist = moving_speed * 0.4 / (16 / 30) * delta;
                    if (allowMove > 0) { 
                        dist = Math.min(allowMove, dist);
                        allowMove -= dist;
                        character.translateZ(dist);
                        if (isCrashed()) {
                            character.translateZ(-dist);
                        }
                    }
                }

                if (mixer) mixer.update(delta);
            });

            // compute the box that contains all the stuff
            // from root and below
            const box = new THREE.Box3().setFromObject(root);

            const boxSize = box.getSize(new THREE.Vector3()).length();
            const boxCenter = box.getCenter(new THREE.Vector3());

            // set the camera to frame the box
            frameArea(boxSize * 0.5, boxSize, boxCenter, camera);

            // update the Trackball controls to handle the new size
            controls.target.copy(boxCenter);
            controls.update();
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

    register(function() {
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
