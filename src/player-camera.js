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

      this._CharacterController = params.playerEntity.GetComponent('BasicCharacterController');
    }

    _CalculateIdealOffset() {
      const idealBehindOffset = new THREE.Vector3(0, 10, -17);
      if (this._CharacterController && this._CharacterController._IsFreeLook) {
        idealBehindOffset.applyQuaternion(this._CharacterController._FreeLookQuaternion);
      } else {
        idealBehindOffset.applyQuaternion(this._params.playerEntity._rotation);
      }
      idealBehindOffset.add(this._params.playerEntity._position);
      return idealBehindOffset;
    }

    _CalculateIdealLookat() {
      const idealLookat = new THREE.Vector3(0, 5, 20);

      if (this._CharacterController && this._CharacterController._IsFreeLook) {
        idealLookat.applyQuaternion(this._CharacterController._FreeLookQuaternion);
      } else {
        idealLookat.applyQuaternion(this._params.playerEntity._rotation);
      }
      idealLookat.add(this._params.playerEntity._position);
      return idealLookat;
    }

    Update(timeElapsed) {

      ///////////////
      //// OKAY still need to handle transitioning between IsFreeLook true and false values....
      //// I think, when right click starts to override left click, _FreeLookQuaternion needs
      //// to get overwritten with playerEntity._rotation, but does that happen here in camera
      //// or does it happen in player-entity?
      //// Because the other important transition event is, if freelook moved the camera, and we
      //// switch to right-click, then playerEntity._rotation needs to be set to _FreeLookQuaternion...
      //// Ahhh okay so then I think it is, normal updates always set freelook to player, EXCEPT
      //// when we are switching from freelook true to false and right-click is down. In that ONE
      //// update, we set the player to freelook.... Yes I think we need to do that in the
      //// player-entity code because that has easier access to the right and left click values.
      ///////////////



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