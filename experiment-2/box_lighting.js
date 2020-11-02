// import modules from threejs.org
import * as THREE from 'https://threejs.org/build/three.module.js';

// use jsm instead of js - they were deprecated.
import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
// import { VRMLoader } from 'https://threejs.org/examples/jsm/loaders/VRMLoader.js';
// import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';

function main() {
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas 
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.GammaEncoding;

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

    // create plane
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

    // // light to character
    // {
    //     const color = 0xFFFFFF;
    //     const intensity = 1;
    //     const light = new THREE.DirectionalLight(color, intensity);
    //     light.position.set(5, 10, 2);
    //     scene.add(light);
    //     scene.add(light.target);
    // }


    {
        // const myShader = {
        //     uniforms: THREE.UniformsUtils.merge( [
        //         THREE.UniformsLib.common,
        //         THREE.UniformsLib.specularmap,
        //         THREE.UniformsLib.envmap,
        //         THREE.UniformsLib.aomap,
        //         THREE.UniformsLib.lightmap,
        //         THREE.UniformsLib.emissivemap,
        //         THREE.UniformsLib.fog,
        //         THREE.UniformsLib.lights,
        //         {
        //             emissive: { value: new THREE.Color( 0x000000 ) }
        //         }
        //     ] ),
    
        //     vertexShader: THREE.ShaderChunk.meshlambert_vert,
        //     fragmentShader: THREE.ShaderChunk.meshlambert_frag
        // };

        // console.log(THREE.ShaderChunk["lights_lambert_vertex"]);
        let wall = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1, 1, 1),
            new THREE.MeshLambertMaterial()
            // new THREE.ShaderMaterial(myShader)
        );
        wall.position.set(0, 2, 0);
        scene.add(wall);
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

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

main();
