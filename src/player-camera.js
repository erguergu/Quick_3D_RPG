import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import {entity} from './entity.js';


export const player_camera = (() => {
  
  class PlayerCamera extends entity.Component {
    constructor(params) {
      super();

      this._params = params;
      this._camera = params.camera;

      this._currentPosition = this._CalculateIdealOffset();
      this._currentLookat = this._CalculateIdealLookat();

      this._camera.position.copy(this._currentPosition);
      this._camera.lookAt(this._currentLookat);
    }

    _CalculateIdealOffset() {
      const idealBehindOffset = new THREE.Vector3(0, 10, -17);
      idealBehindOffset.applyQuaternion(this._params.target._rotation);
      idealBehindOffset.add(this._params.target._position);
      return idealBehindOffset;
    }

    _CalculateIdealLookat() {
      const idealLookat = new THREE.Vector3(0, 5, 20);
      idealLookat.applyQuaternion(this._params.target._rotation);
      idealLookat.add(this._params.target._position);
      return idealLookat;
    }

    Update(timeElapsed) {
      const idealOffset = this._CalculateIdealOffset();
      const idealLookat = this._CalculateIdealLookat();

      // const t = 0.05;
      // const t = 4.0 * timeElapsed;
      const t = 1.0 - Math.pow(0.01, timeElapsed);

      this._currentPosition.lerp(idealOffset, t);
      this._currentLookat.lerp(idealLookat, t);

      //this._camera.position.copy(this._currentPosition);
      //this._camera.lookAt(this._currentLookat);
      this._camera.position.copy(idealOffset);
      this._camera.lookAt(idealLookat);
    }
  }

  return {
    PlayerCamera: PlayerCamera
  };

})();