// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

// use jsm instead of js - they were deprecated.
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
// import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

function randomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function generateMaze(w, h, sx, sy) {
    const move = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let maze = [];

    for (let i = 0; i < 2 * w + 1; i++) {
        maze.push([]);
        for (let j = 0; j < 2 * h + 1; j++) {
            maze[i].push(1); // 1: wall, 0: empty
        }
    }

    let list = [];

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
    const vertexShaderII = [
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
    ].join("\n");

    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas 
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.GammaEncoding;
    // renderer.gammaFactor = 2;
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 10, 20);

    // use OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.maxDistance = 5;
    controls.target.set(0, 5, 0);
    controls.update();

    // create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    const planeSize = 40;
    var maze;
    let boxList = [];

    // create plane - to do: shader
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

        const mesh_lower = new THREE.Mesh(planeGeo, planeMat);
        mesh_lower.rotation.x = Math.PI * -.5;
        mesh_lower.position.y = -0.001;
        scene.add(mesh_lower);
    }

    // create maze
    {
        maze = generateMaze(planeSize / 2, planeSize / 2, 0, 0);
        const loader = new THREE.TextureLoader();
        const texture = loader.load('./images/checker.png');
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        var uniforms = [];

        for (let i = 0; i < maze.length; i++) {
            for (let j = 0; j < maze[0].length; j++) {
                if (maze[i][j]) {
                    uniforms.push({
                        iTime: { value: 0 },
                        iResolution:  { value: new THREE.Vector3(1, 1, 1) },
                        iChannel0: { value: texture },
                    });
                    let wall = new THREE.Mesh(
                        new THREE.BoxBufferGeometry(1, 1, 1),
                        new THREE.ShaderMaterial({
                            vertexShader: document.getElementById('vertexShader').textContent,
                            fragmentShader: document.getElementById('fragmentShader').textContent,
                            uniforms: uniforms[uniforms.length - 1]
                        })
                    );
                    wall.position.set(i - planeSize / 2, 0.5, j - planeSize / 2);
                    boxList.push(new THREE.Box3().setFromObject(wall));
                    scene.add(wall);
                }
            }
        }
    }


    // light to ground
    {
        const skyColor = 0xB1E1FF;  // light blue
        const groundColor = 0xB97A20;  // brownish orange
        const intensity = 1;
        const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
        scene.add(light);
    }

    // light to scene
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
        var root;
        var mixer;
        const inf = 1 << 20;
        const after_walk = 0.4;
        var allowMove = 0;
        var walking = false;
        var moving = false;
        var turning_left = false;
        var turning_right = false;
        var turning_speed = 2;
        var moving_speed = 2;
        var clock = new THREE.Clock();
        var character;

        const gltfLoader = new GLTFLoader();
        
        var mesh_uniforms = {
            u_resolution: { value: new THREE.Vector2() },
            u_texture: { value: null }
        };

        gltfLoader.load('character_walk.glb', (gltf) => {
            root = gltf.scene;
            gltf.scene.traverse(function(child) {
                if (child.isMesh) {
                    mesh_uniforms.u_texture.value = child.material.emissiveMap;
                    let shader_material = new THREE.ShaderMaterial({
                        uniforms: mesh_uniforms,
                        vertexShader: vertexShaderII,
                        fragmentShader: document.getElementById('fragmentShaderII').textContent,
                        skinning: true
                    });
                    child.castShadow = true;
                    child.material = shader_material;
                }
            });
            character = root.children[2];
            character.position.set(1 - planeSize / 2, 0, 1 - planeSize / 2);
            scene.add(root);
            
            mixer = new THREE.AnimationMixer(root);

            var walk_start = mixer.clipAction(gltf.animations[1]);
                walk_start.setLoop(THREE.LoopOnce);
                walk_start.timeScale = moving_speed;
                walk_start.clampWhenFinished = true;
            var walk = mixer.clipAction(gltf.animations[0]);
                walk.timeScale = moving_speed;
            var walk_stop = mixer.clipAction(gltf.animations[2]);
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
            // controls.maxDistance = boxSize * 10;
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
    
    function isCrashed() {
        let characterBox = new THREE.Sphere(character.position, 0.2);
        for (let i = 0; i < boxList.length; i++) {
            if (characterBox.intersectsBox(boxList[i])) return true;
        }
        return false;
    }

    function update(time) {
        if (character) {
            // animation
            let delta = clock.getDelta();

            let posBefore = character.position.clone();
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
            
            controls.target.set(
                character.position.x,
                character.position.y + 1,
                character.position.z
            );

            // console.log(camera.position);
            camera.updateProjectionMatrix();
        }
        
        // walls 
        const canvas = renderer.domElement;
        for (let i = 0; i < uniforms.length; i++) {
            uniforms[i].iResolution.value.set(canvas.width, canvas.height, 1);
            // some random magic numbers
            uniforms[i].iTime.value = time * 0.001 + (i * 65535) % 876 * 0.01; 
        }
        mesh_uniforms.u_resolution.value.set(canvas.width, canvas.height);

        // OrbitControls
        controls.update();
    }

    function render(time) {
        update(time);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        renderer.render(scene, camera);

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
