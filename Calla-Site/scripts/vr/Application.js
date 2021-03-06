import { PerspectiveCamera } from "three/src/cameras/PerspectiveCamera";
import { Object3D } from "three/src/core/Object3D";
import { AmbientLight } from "three/src/lights/AmbientLight";
import { Color } from "three/src/math/Color";
import { Vector3 } from "three/src/math/Vector3";
import { WebGLRenderer } from "three/src/renderers/WebGLRenderer";
import { Scene } from "three/src/scenes/Scene";
import { AudioManager } from "../calla/audio/AudioManager";
import { EventBase } from "../calla/events/EventBase";
import { setRightUpFwdPos } from "../calla/math/setRightUpFwd";
import { CameraControl } from "../input/CameraControl";
import { CursorControl } from "../input/CursorControl";
import { EventSystem } from "../input/EventSystem";
import { ScreenPointerControls } from "../input/ScreenPointerControls";
import { Stage } from "../input/Stage";
import { ThreeJSTimer } from "../timers/ThreeJSTimer";
import { Fader } from "./Fader";
import { LoadingBar } from "./LoadingBar";
import { ScreenControl } from "./ScreenControl";
import { Skybox } from "./Skybox";
import { UISystem } from "./UISystem";

const visibleBackground = new Color(0x606060);
const invisibleBackground = new Color(0x000000);
const R = new Vector3();
const U = new Vector3();
const F = new Vector3();
const P = new Vector3();

export class Application extends EventBase {
    constructor() {
        super();

        this.audio = new AudioManager();
        this.audio.addEventListener("audioready", () => {
            this.audio.createLocalUser("local-user");
        });

        this.renderer = new WebGLRenderer({
            canvas: document.getElementById("frontBuffer"),
            powerPreference: "high-performance",
            precision: "highp",
            antialias: true,
            depth: true,
            stencil: true,
            premultipliedAlpha: true,
            logarithmicDepthBuffer: true,
            alpha: false,
            preserveDrawingBuffer: false
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.xr.enabled = true;

        this.camera = new PerspectiveCamera(50, 1, 0.01, 1000);

        this.fader = new Fader(this.camera);
        this.fadeDepth = 0;

        this.skybox = new Skybox(this.camera);
        this.skybox.visible = false;
        this.showSkybox = false;

        this.stage = new Stage(this.camera);
        this.stage.position.set(0, 0, 0);

        this.light = new AmbientLight(0xffffff, 1);

        this.background = new Object3D();
        this.background.name = "Background";
        this.background.add(this.light);
        this.background.add(this.skybox);
        this.background.add(this.stage);

        this.menu = new Object3D();
        this.menu.name = "Menu";

        this.foreground = new Object3D();
        this.foreground.name = "Foreground";
        this.foreground.add(this.menu);

        this.loadingBar = new LoadingBar();
        this.loadingBar.position.set(0, 1.5, -2);

        this.transition = new Object3D();
        this.transition.name = "Transition";
        this.transition.visible = false;
        this.transition.add(this.loadingBar);

        this.scene = new Scene();
        this.scene.background = visibleBackground;
        this.scene.add(this.background);
        this.scene.add(this.foreground);
        this.scene.add(this.transition);

        this.controls = new ScreenPointerControls(this.renderer.domElement);

        this.cameraControl = new CameraControl(this.camera, this.stage, this.controls);

        this.screenControl = new ScreenControl(this.renderer, this.camera);
        document.body.append(this.screenControl.element);

        this.cursors = new CursorControl(this.renderer.domElement);

        this.eventSystem = new EventSystem(this.cursors, this.camera, this.foreground, this.controls);
        this.uiSystem = new UISystem(this.eventSystem);

        const update = (evt) => {

            this.cameraControl.update();

            if (!this.showSkybox) {
                this.skybox.visible = false;
            }
            this.skybox.update();

            this.audio.update();

            this.loadingBar.update(evt.sdt);

            this.fader.update(evt.sdt);

            this.stage.presentationPoint.getWorldPosition(this.transition.position);
            this.stage.presentationPoint.getWorldQuaternion(this.transition.quaternion);

            setRightUpFwdPos(this.camera.matrixWorld, R, U, F, P);
            this.audio.setUserPose(
                "local-user",
                P.x, P.y, P.z,
                F.x, F.y, F.z,
                U.x, U.y, U.z,
                0);

            this.menu.position.copy(this.transition.position);
            this.menu.quaternion.copy(this.transition.quaternion);

            this.renderer.render(this.scene, this.camera);
        };
        this.timer = new ThreeJSTimer(this.renderer);
        this.timer.addEventListener("tick", update);

        window.app = this;
    }

    start() {
        this.timer.start();
        this.dispatchEvent(new Event("started"));
    }

    clearScene() {
        this.dispatchEvent(new Event("sceneclearing"));
        this.menu.remove(...this.menu.children);
        this.foreground.remove(...this.foreground.children);
        this.foreground.add(this.menu);
    }

    async fadeOut() {
        ++this.fadeDepth;
        if (this.fadeDepth === 1) {
            await this.fader.fadeOut();
            this.skybox.visible = false;
            this.scene.background = invisibleBackground;
            this.foreground.visible = false;
            this.transition.visible = true;
            this.loadingBar.onProgress(0, 1);
            await this.fader.fadeIn();
        }
    }

    async fadeIn() {
        --this.fadeDepth;
        if (this.fadeDepth === 0) {
            await this.fader.fadeOut();
            this.skybox.visible = this.showSkybox;
            this.scene.background = visibleBackground;
            this.foreground.visible = true;
            this.transition.visible = false;
            await this.fader.fadeIn();
        }
    }

    /**
     * @param {number} soFar
     * @param {number} total
     * @param {string?} msg
     */
    onProgress(soFar, total, msg) {
        this.loadingBar.onProgress(soFar, total, msg);
    }
}