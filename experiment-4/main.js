// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

// use jsm instead of js - they were deprecated.
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://threejs.org/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import { MMDLoader } from 'https://threejs.org/examples/jsm/loaders/MMDLoader.js';
import { MMDAnimationHelper } from 'https://threejs.org/examples/jsm/animation/MMDAnimationHelper.js';
import { OutlineEffect } from 'https://threejs.org/examples/jsm/effects/OutlineEffect.js';

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

    /**
     * @type {Array} boxs for crash detection
     */
    let box_list = [];

    let pid = 0;
    let helper = null;
    let ready = false;

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
    // renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // create camera
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    const listener = new THREE.AudioListener();
    camera.add(listener);
    camera.position.set(0, 10, 20);
    register(function () {
        camera.updateProjectionMatrix();
    });

    // create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    // enable OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.minDistance = 0.2;
    controls.maxDistance = 5;
    controls.target.set(-1000, 5, -1000);
    controls.update();

    // enable stats monitor
    {
        const stats = new Stats();
        document.querySelector("#stats").appendChild(stats.dom);
        register(function () {
            stats.update();
        });
    }

    // room: lobby
    {
        const roomSize = 10;
        {
            const loader = new THREE.TextureLoader();

            const floorGeo = new THREE.PlaneBufferGeometry(roomSize, roomSize);
            const floorMat = new THREE.MeshStandardMaterial({
                roughness: 0.8,
                color: 0xffffff,
                metalness: 0.2,
                bumpScale: 0.0005,
                side: THREE.DoubleSide,
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
            mesh.position.set(-1000, 0, -1000);
            scene.add(mesh);
        }

        {
            function addWall(x, y, rot, color) {
                const geometry = new THREE.CubeGeometry(10, 4, 0.1);
                const material = new THREE.MeshStandardMaterial({
                    color: color
                });
                var wall = new THREE.Mesh(geometry, material);
                wall.rotateY(rot);
                wall.position.set(-1000 - x, 2, -1000 - y);
                wall.receiveShadow = true;
                box_list.push(new THREE.Box3().setFromObject(wall));
                scene.add(wall);
            }
            addWall(0, roomSize / 2, 0, "brown");
            addWall(roomSize / 2, 0, Math.PI * -.5, "blue");
            addWall(0, -roomSize / 2, 0, "green");
            addWall(-roomSize / 2, 0, Math.PI * -.5, "red");
        }

        // model from xjf
        {
            let light = new THREE.SpotLight('#ffffff', 1.0);
            light.castShadow = true;
            light.distance = 600;
            light.angle = 0.6;
            light.position.set(0, 300, -100);
            light.shadow.camera.near = 5;
            light.shadow.camera.far = 150;
            light.shadow.camera.visible = true;
            light.shadow.mapSize.width = 1024;
            light.shadow.mapSize.height = 1024;
            // scene.add(light);

            let light2 = new THREE.SpotLight('#ffffff', 1.0);
            light2.castShadow = true;
            light2.distance = 600;
            light2.angle = 0.6;
            light2.position.set(-300, 100, 100);
            light2.shadow.camera.near = 5;
            light2.shadow.camera.far = 150;
            light2.shadow.camera.visible = true;
            light2.shadow.mapSize.width = 1024;
            light2.shadow.mapSize.height = 1024;

            var material = new THREE.ShaderMaterial({
                uniforms: {
                    texture1: { type: "t", value: THREE.ImageUtils.loadTexture('models/table.png') },
                    u_light1Position: { value: new THREE.Vector3(light.position.x, light.position.y, light.position.z) },
                    u_light1Color: { value: new THREE.Vector3(1.0, 1.0, 1.0) },

                    u_light2Position: { value: new THREE.Vector3(light2.position.x, light2.position.y, light2.position.z) },
                    u_light2Color: { value: new THREE.Vector3(1.0, 1.0, 1.0) },

                    shininess: { value: 2.0 },
                    eye: { value: new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z) }
                },
                vertexShader: document.getElementById('vs_xjf').textContent.trim(),
                fragmentShader: document.getElementById('fs_xjf').textContent.trim(),
            });

            var loader = new OBJLoader();
            var pivot = new THREE.Object3D();
            loader.load('./models/table.obj', function (obj) {
                obj.traverse(function (child) {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                })
                pivot.add(obj);
                pivot.scale.set(0.02, 0.02, 0.02);
                pivot.position.set(-1000, 0, -1003);
                box_list.push(new THREE.Box3().setFromObject(pivot));
                scene.add(pivot);
            });
        }

        // model from ssr
        {
            let uniforms = {
                texture1: { type: "t", value: THREE.ImageUtils.loadTexture('./models/people.png') },
                u_lightPosition: { value: new THREE.Vector3(0, 300, 100) },
            };

            let material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                vertexShader: document.getElementById('vs_ssr').textContent.trim(),
                fragmentShader: document.getElementById('fs_ssr').textContent.trim(),
                lights: false
            });

            var loader = new OBJLoader();
            loader.load('./models/people.obj', function (obj) {
                let mesh = obj;
                for (var k in obj.children) {
                    obj.children[k].geometry.computeVertexNormals();
                    obj.children[k].castShadow = true;
                    obj.children[k].receiveShadow = true;
                    obj.children[k].material = material;
                }
                mesh.position.set(-1002, 0, -1003);
                mesh.scale.set(0.009, 0.009, 0.009);
                mesh.rotateY(Math.PI * .5);
                box_list.push(new THREE.Box3().setFromObject(mesh));
                scene.add(mesh);
            });
        }
    }

    // room: maze

    // create plane
    const planeSize = 40;
    {
        const loader = new THREE.TextureLoader();
        const texture = loader.load('./images/checker.png');
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
    let tid = 0;
    const trans_list = [
        function (time, i, j) {
            return time + i * j;
        },
        function (time, i, j) {
            return time + i + j;
        },
        function (time, i, j) {
            return time + i * 40 + j;
        },
        function (time, i, j) {
            return time + (i * 123 + j * 456) % 789;
        },
        function (time, i, j) {
            return time + (i + j) * 110 % 23;
        },
        function (time, i, j) {
            return time * i + j;
        },
        function (time, i, j) {
            return time + (i * 5 + j * 7) % 3;
        },
        function (time, i, j) {
            return time + (i + j) % 2;
        },
        function (time, i, j) {
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
                        iResolution: { value: new THREE.Vector3(1, 1, 1) },
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
                    register(function (time) {
                        uniforms.iTime.value = trans_list[tid % trans_list.length](time * 0.001, i, j);
                    });
                    wall.castShadow = true;
                    scene.add(wall);
                }
            }
        }
    }

    // room: live
    {
        const roomSize = 10;
        {
            const loader = new THREE.TextureLoader();

            const floorGeo = new THREE.PlaneBufferGeometry(roomSize, roomSize);
            const floorMat = new THREE.MeshStandardMaterial({
                roughness: 0.8,
                color: 0xffffff,
                metalness: 0.2,
                bumpScale: 0.0005,
                side: THREE.DoubleSide,
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
            mesh.position.set(1000, 0, 1000);
            scene.add(mesh);
        }

        // let modelFile = './models/har.pmx';
        // let vmdFiles = ['./models/dance.vmd', './models/lip.vmd', './models/facial.vmd'];

        const modelFile = './models/miku_v2.pmd';
        const vmdFiles = ['./models/wavefile_v2.vmd'];
        const audioFile = 'audios/wavefile_short.mp3';
        const audioParams = { delayTime: 160 * 1 / 30 };

        helper = new MMDAnimationHelper({
            afterglow: 2.0
        });
        let loader = new MMDLoader();

        Ammo().then(
            function (AmmoLib) {
                Ammo = AmmoLib;
                loader.loadWithAnimation(modelFile, vmdFiles, function (object) {
                    let mesh = object.mesh;
                    mesh.position.set(1000, 0, 997);
                    mesh.scale.set(0.07, 0.07, 0.07);
                    scene.add(mesh);

                    helper.add(mesh, {
                        animation: object.animation,
                        physics: true
                    });
                    box_list.push(new THREE.Box3().setFromObject(mesh));
                    new THREE.AudioLoader().load(audioFile, function (buffer) {
                        const audio = new THREE.Audio(listener).setBuffer(buffer);
                        helper.add(audio, audioParams);
                        scene.add(mesh);
                        ready = true;
                    });

                    // let ikHelper = helper.objects.get(mesh).ikSolver.createHelper();
                    // ikHelper.visible = false;
                    // scene.add(ikHelper);

                    // let physicsHelper = helper.objects.get(mesh).physics.createHelper();
                    // physicsHelper.visible = false;
                    // scene.add(physicsHelper);

                }, function (xhr) {
                    if (xhr.lengthComputable) {
                        var percentComplete = xhr.loaded / xhr.total * 100;
                        console.log(Math.round(percentComplete, 2) + '% downloaded');
                    }
                });
            }
        );
    }


    // general: light
    // const ambient = new THREE.AmbientLight(0x666666);
    // scene.add(ambient);

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

    // Add Bulb Light
    {
        const bulbGeometry = new THREE.SphereBufferGeometry(0.02, 16, 8);
        const bulbLight = new THREE.PointLight(0xffee88, 50, 100, 2);
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
        bulbLight.position.set(-1000, 5, -1000);
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

        gltfLoader.load('./models/character.glb', (gltf) => {
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
            root.traverse(function (child) {
                if (child.isMesh) {
                    const uniforms = {
                        iResolution: { value: new THREE.Vector2() },
                        iTexture: { value: null }
                    };
                    uniforms.iTexture.value = child.material.emissiveMap;
                    register(function (time) {
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
            // character.position.set(1 - planeSize / 2, 0, 1 - planeSize / 2);
            character.position.set(-1000, 0, -1000);
            // character.position.set(1000, 0, 1000);
            register(function () {
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

            // TODO: implement motion with weight
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

            mixer.addEventListener('loop', function (e) {
                let name = e.action.getClip().name;
                allowMove = inf;
                if (name == "Walk" && !walking) playWalkStop();
            });

            mixer.addEventListener('finished', function (e) {
                let name = e.action.getClip().name;
                allowMove = inf;
                if (name == "Walk_Start") {
                    if (walking) playWalk();
                    else playWalkStop();
                } else if (name == "Walk_Stop") {
                    moving = false;
                }
            });

            document.addEventListener('keydown', function (e) {
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
                } else if (e.key == 'p') {
                    pid = (pid + 1) % 3;
                    if (pid == 2) {
                        character.position.set(1 - planeSize / 2, 0, 1 - planeSize / 2);
                    } else if (pid == 0) {
                        character.position.set(-1000, 0, -1000);
                    } else if (pid == 1) {
                        ready = true;
                        character.position.set(1000, 0, 1000);
                    }
                    camera.position.set(
                        character.position.x + 3,
                        character.position.y + 5,
                        character.position.z + 3
                    );
                }
            }, false);

            document.addEventListener('keyup', function (e) {
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

            register(function (time) {
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
                if (helper && ready) helper.update(delta);
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
    // let effect = new OutlineEffect(renderer);
    function render(time) {
        update(time);

        renderer.render(scene, camera);
        // effect.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
