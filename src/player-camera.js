import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { entity } from './entity.js';


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

      this._CharacterController = params.playerEntity.GetComponent('BasicCharacterController');
    }

    _CalculateIdealOffset() {
      const idealBehindOffset = new THREE.Vector3(0, 5, -17);
      if (this._CharacterController) {
        idealBehindOffset.z = -this._CharacterController._CameraDistance;
        if (this._CharacterController._IsFreeLook) {
          idealBehindOffset.applyQuaternion(this._CharacterController._FreeLookQuaternion);
        } else {
          idealBehindOffset.applyQuaternion(this._CharacterController._FollowQuaternion);
        }
        idealBehindOffset.add(this._params.playerEntity._position);
      }
      return idealBehindOffset;
    }

    _CalculateIdealLookat() {
      //const idealLookat = new THREE.Vector3(0, 5, 20);
      const idealLookat = new THREE.Vector3(0, 5, 0);

      if (this._CharacterController) {
        if (this._CharacterController._IsFreeLook) {
          idealLookat.applyQuaternion(this._CharacterController._FreeLookQuaternion);
        } else {
          idealLookat.applyQuaternion(this._CharacterController._FollowQuaternion);
        }
        idealLookat.add(this._params.playerEntity._position);
      }
      return idealLookat;
    }

    Update(timeElapsed) {

      const idealOffset = this._CalculateIdealOffset();
      const idealLookat = this._CalculateIdealLookat();

      const wasFreeLook = this._CharacterController._WasFreeLook;
      const isFreeLook = this._CharacterController._IsFreeLook;
      if (wasFreeLook != isFreeLook) {
        // Player Update Fires before Camera Update
        //console.log(`Camera: _WasFreeLook = ${wasFreeLook}`);
        //console.log(`Camera: _IsFreeLook = ${isFreeLook}`);
      }

      this._camera.position.copy(idealOffset);
      this._camera.lookAt(idealLookat);
    }
  }

  return {
    PlayerCamera: PlayerCamera
  };

})();