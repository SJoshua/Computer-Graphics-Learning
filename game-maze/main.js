// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

// use jsm instead of js - they were deprecated.
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
// import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

/**
 * Returns a random integer in [0, max].
 * @param {number} max 
 */
function randomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

/**
 * Returns a randomly generated maze. 
 * (Prim's Algorithm)
 * @param {number} w - width of area
 * @param {number} h - height of area
 * @param {number} sx - x of start point
 * @param {number} sy - y of start point
 */
function generateMaze(w, h, sx, sy) {
    const move = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let maze = [];

    for (let i = 0; i < 2 * w + 1; i++) {
        maze.push([]);
        for (let j = 0; j < 2 * h + 1; j++) {
            maze[i].push(1); // 1: wall, 0: empty
        }
    }

    /**
     * @type {Array} (x, y) pairs as candidate walls.
     */
    let list = [];

    /**
     * Add walls nearby to the list.
     * @param {number} x 
     * @param {number} y 
     */
    function update(x, y) {
        maze[x][y] = 0;
        for (let k = 0; k < 4; k++) {
            let nx = x + 2 * move[k][0], ny = y + 2 * move[k][1];
            if (0 < nx && nx < 2 * w && 0 < ny && ny < 2 * h) {
                list.push([x + move[k][0], y + move[k][1]]);
            }
        }
    }

    update(2 * sx + 1, 2 * sy + 1);

    while (list.length) {
        let index = randomInt(list.length);
        let t = list[index];
        list.splice(index, 1);
        let a = [t[0] - !(t[0] & 1), t[1] - !(t[1] & 1)];
        let b = [t[0] + !(t[0] & 1), t[1] + !(t[1] & 1)];
        if (maze[a[0]][a[1]] ^ maze[b[0]][b[1]]) {
            maze[t[0]][t[1]] = 0;
            if (maze[a[0]][a[1]]) {
                update(a[0], a[1]);
            } else {
                update(b[0], b[1]);
            }
        }
    } 
    
    return maze;
}

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.GammaEncoding;

    // create camera
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);
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
    const planeSize = 40;
    {
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
        mesh.receiveShadow = true;
        scene.add(mesh);

        // avoid flicks
        const mesh_lower = new THREE.Mesh(planeGeo, planeMat);
        mesh_lower.rotation.x = Math.PI * -.5;
        mesh_lower.position.y = -0.001;
        scene.add(mesh_lower);
    }

    // create maze
    let box_list = [];
    let tid = 0;
    const trans_list = [
        function(time, i, j) {
            return time + i * j;
        },
        function(time, i, j) {
            return time + i + j;
        },
        function(time, i, j) {
            return time + i * 40 + j;
        },
        function(time, i, j) {
            return time + (i * 123 + j * 456) % 789;
        },
        function(time, i, j) {
            return time + (i + j) * 110 % 23;
        },
        function(time, i, j) {
            return time * i + j;
        },
        function(time, i, j) {
            return time + (i * 5 + j * 7) % 3;
        },
        function(time, i, j) {
            return time + (i + j) % 2;
        },
        function(time, i, j) {
            return time;
        },
    ];
    {
        const maze = generateMaze(planeSize / 2, planeSize / 2, 0, 0);

        const loader = new THREE.TextureLoader();
        const texture = loader.load('./images/checker.png');
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        for (let i = 0; i < maze.length; i++) {
            for (let j = 0; j < maze[0].length; j++) {
                if (maze[i][j]) {
                    const uniforms = {
                        iTime: { value: 0 },
                        iResolution:  { value: new THREE.Vector3(1, 1, 1) },
                        iChannel0: { value: texture }
                    };
                    let wall = new THREE.Mesh(
                        new THREE.BoxBufferGeometry(1, 1, 1),
                        new THREE.ShaderMaterial({
                            vertexShader: document.getElementById('vertexShader').textContent,
                            fragmentShader: document.getElementById('fragmentShader').textContent,
                            uniforms: uniforms
                        })
                    );
                    wall.position.set(i - planeSize / 2, 0.5, j - planeSize / 2);
                    box_list.push(new THREE.Box3().setFromObject(wall));
                    register(function(time) {
                        uniforms.iTime.value = trans_list[tid % trans_list.length](time * 0.001, i, j);
                    });
                    wall.castShadow = true;
                    scene.add(wall);
                }
            }
        }
    }

    // Add Hemisphere Light
    {
        const skyColor = 0xB1E1FF;  // light blue
        const groundColor = 0xB97A20;  // brownish orange
        const intensity = 1;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    // Add Directional Light
    {
        const color = 0xFFFFFF;
        const intensity = 1;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(0, 10, 0);
        light.castShadow = true;
        light.shadow.camera.top = 20;
        light.shadow.camera.bottom = -20;
        light.shadow.camera.left = -20;
        light.shadow.camera.right = 20;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 100;
        scene.add(light);
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
                    const uniforms = {
                        iResolution: { value: new THREE.Vector2() },
                        iTexture: { value: null }
                    };  
                    uniforms.iTexture.value = child.material.emissiveMap;
                    register(function(time) {
                        uniforms.iResolution.value.set(canvas.width, canvas.height); 
                    });
                    let shader_material = new THREE.ShaderMaterial({
                        uniforms: uniforms,
                        vertexShader: [
                            "uniform float offset;",
                            "varying vec2 vUv;",
                            THREE.ShaderChunk["common"],
                            THREE.ShaderChunk["skinning_pars_vertex"], //skinning vertex parser
                            "void main() {",
                                "vUv = uv;",
                                "vec3 transformed = vec3(position + normal * offset);",
                                THREE.ShaderChunk["skinbase_vertex"],
                                THREE.ShaderChunk["skinning_vertex"],
                                THREE.ShaderChunk["project_vertex"],
                            "}"
                        ].join("\n"),
                        fragmentShader: document.getElementById('fragmentShaderII').textContent,
                        skinning: true
                    });
                    child.castShadow = true;
                    child.material = shader_material;
                }
            });
            
            const character = root.children[2];
            character.position.set(1 - planeSize / 2, 0, 1 - planeSize / 2);
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
                } else if (e.key == 'c') {
                    tid++;
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
                let characterBox = new THREE.Sphere(character.position, 0.2);
                for (let i = 0; i < box_list.length; i++) {
                    if (characterBox.intersectsBox(box_list[i])) return true;
                }
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

    function render(time) {
        update(time);

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
