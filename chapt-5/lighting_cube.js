// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';

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
    
    // create camera
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(3, 2, 3);
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
    controls.target.set(0, 0.5, 0);
    controls.update();

    // enable stats monitor
    {
        const stats = new Stats();
        document.querySelector("#stats").appendChild(stats.dom);
        register(function () {
            stats.update();
        });
    }

    // Add cube 
    {
        const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
        // const material = new THREE.MeshPhysicalMaterial({ color: 0x000000 });
        const uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.phong.uniforms
        ]);

        uniforms.shininess.value = 100;

        var material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: document.getElementById('vertexShader_I').textContent,
            fragmentShader: document.getElementById('fragmentShader_I').textContent,
            lights: true
        });

        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
    }

    // Add Ambient Light
    {
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
    }

    // Add Bulb Light
    {
        function addBulbLight(x, y, z, color) {
            const bulbGeometry = new THREE.SphereBufferGeometry(0.02, 16, 8);
            const bulbLight = new THREE.PointLight(color, 0.5, 0, 2);

            const bulbMat = new THREE.MeshStandardMaterial({
                emissive: color,
                emissiveIntensity: 1,
                color: 0x000000
            });

            bulbLight.add(new THREE.Mesh(bulbGeometry, bulbMat));
            bulbLight.position.set(x, y, z);
            
            scene.add(bulbLight);
        }
        addBulbLight(1, 0, 0, 0xff0000);
        addBulbLight(0, 1, 0, 0x00ff00);
        addBulbLight(0, 0, 1, 0x0000ff);
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
