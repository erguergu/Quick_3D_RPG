import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {entity} from "./entity.js";


export const player_input = (() => {

  class PickableComponent extends entity.Component {
    constructor() {
      super();
    }

    InitComponent() {
    }
  };

  class BasicCharacterControllerInput extends entity.Component {
    constructor(params) {
      super();
      this._params = params;
      this._Init();
    }
  
    _Init() {
      this._mouseMovementX = 0;
      this._mouseMovementY = 0;
      this._mouseDownLeft = false;
      this._mouseDownRight = false;
      this._keys = {
        mouseforward: false,
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
      };
      this._raycaster = new THREE.Raycaster();
      const canv = document.getElementById('threejs');
      document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
      document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
      canv.addEventListener('mouseup', (e) => this._onMouseUp(e), false);
      canv.addEventListener('mousedown', (e) => this._onMouseDown(e), false);
      canv.addEventListener('mousemove', (e) => this._onMouseMove(e), false);
      canv.addEventListener('contextmenu', event => event.preventDefault());
      console.log(`The canvas is:`, canv);
      canv.addEventListener("click", (e) => this._onClick(e), false);
    }

    _onClick(event) {
      event.preventDefault();
      //console.log(`You clicked!`);
      return false;
    }

    _onMouseMove(event) {
      event.preventDefault();
      this._mouseMovementX = event.movementX;
      this._mouseMovementY = event.movementY;
      //console.log(`_onMouseMove`, event);
      return false;
    }

    _onMouseDown(event) {
      event.preventDefault();

      if (event.button == 0) {
        this._mouseDownLeft = true;
      } else if (event.button == 2) {
        this._mouseDownRight = true;
      }

      if (this._mouseDownLeft && this._mouseDownRight) {
        this._keys.mouseforward = true;
      }
      return false;
    }
  
    _onMouseUp(event) {
      event.preventDefault();

      if (event.button == 0) {
        this._mouseDownLeft = false;
      } else if (event.button == 2) {
        this._mouseDownRight = false;
      }

      if (!this._mouseDownLeft || !this._mouseDownRight) {
        this._keys.mouseforward = false;
      }

      const rect = document.getElementById('threejs').getBoundingClientRect();
      const pos = {
        x: ((event.clientX - rect.left) / rect.width) * 2  - 1,
        y: ((event.clientY - rect.top ) / rect.height) * -2 + 1,
      };

      this._raycaster.setFromCamera(pos, this._params.camera);

      const pickables = this._parent._parent.Filter((e) => {
        const p = e.GetComponent('PickableComponent');
        if (!p) {
          return false;
        }
        return e._mesh;
      });

      const ray = new THREE.Ray();
      ray.origin.setFromMatrixPosition(this._params.camera.matrixWorld);
      ray.direction.set(pos.x, pos.y, 0.5).unproject(
          this._params.camera).sub(ray.origin).normalize();

      // hack
      document.getElementById('quest-ui').style.display = 'none';

      for (let p of pickables) {
        // GOOD ENOUGH
        const box = new THREE.Box3().setFromObject(p._mesh);

        if (ray.intersectsBox(box)) {
          p.Broadcast({
              topic: 'input.picked'
          });
          break;
        }
      }
    }

    _onKeyDown(event) {
      switch (event.keyCode) {
        case 87: // w
          this._keys.forward = true;
          break;
        case 65: // a
          this._keys.left = true;
          break;
        case 83: // s
          this._keys.backward = true;
          break;
        case 68: // d
          this._keys.right = true;
          break;
        case 32: // SPACE
          this._keys.space = true;
          break;
        case 16: // SHIFT
          this._keys.shift = true;
          break;
      }
    }
  
    _onKeyUp(event) {
      switch(event.keyCode) {
        case 87: // w
          this._keys.forward = false;
          break;
        case 65: // a
          this._keys.left = false;
          break;
        case 83: // s
          this._keys.backward = false;
          break;
        case 68: // d
          this._keys.right = false;
          break;
        case 32: // SPACE
          this._keys.space = false;
          break;
        case 16: // SHIFT
          this._keys.shift = false;
          break;
      }
    }

  };

  return {
    BasicCharacterControllerInput: BasicCharacterControllerInput,
    PickableComponent: PickableComponent,
  };

})();