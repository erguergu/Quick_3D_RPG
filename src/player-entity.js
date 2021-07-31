import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';

import { entity } from './entity.js';
import { finite_state_machine } from './finite-state-machine.js';
import { player_state } from './player-state.js';


export const player_entity = (() => {

  class CharacterFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }

    _Init() {
      this._AddState('idle', player_state.IdleState);
      this._AddState('walk', player_state.WalkState);
      this._AddState('run', player_state.RunState);
      this._AddState('attack', player_state.AttackState);
      this._AddState('death', player_state.DeathState);
    }
  };

  class BasicCharacterControllerProxy {
    constructor(animations) {
      this._animations = animations;
    }

    get animations() {
      return this._animations;
    }
  };


  class BasicCharacterController extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this._camera = params._camera;
      this._CameraDistance = 17;
      this._IsFreeLook = false;
      this._WasFreeLook = false;
      this._FollowQuaternion = new THREE.Quaternion();
      this._FreeLookQuaternion = new THREE.Quaternion();
      this._FreeControlQuaternion = new THREE.Quaternion();
      this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
      this._acceleration = new THREE.Vector3(1, 0.125, 50.0);
      this._velocity = new THREE.Vector3(0, 0, 0);
      this._position = new THREE.Vector3();

      this._animations = {};
      this._stateMachine = new CharacterFSM(
        new BasicCharacterControllerProxy(this._animations));

      this._LoadModels();
    }

    InitComponent() {
      this._RegisterHandler('health.death', (m) => { this._OnDeath(m); });
    }

    _OnDeath(msg) {
      this._stateMachine.SetState('death');
    }

    _LoadModels() {
      const loader = new FBXLoader();
      loader.setPath('./resources/guard/');
      loader.load('castle_guard_01.fbx', (fbx) => {
        this._target = fbx;
        this._target.scale.setScalar(0.035);
        this._params.scene.add(this._target);

        this._bones = {};

        for (let b of this._target.children[1].skeleton.bones) {
          this._bones[b.name] = b;
        }

        this._target.traverse(c => {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material && c.material.map) {
            c.material.map.encoding = THREE.sRGBEncoding;
          }
        });

        this.Broadcast({
          topic: 'load.character',
          model: this._target,
          bones: this._bones,
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const _OnLoad = (animName, anim) => {
          const clip = anim.animations[0];
          const action = this._mixer.clipAction(clip);

          this._animations[animName] = {
            clip: clip,
            action: action,
          };
        };

        this._manager = new THREE.LoadingManager();
        this._manager.onLoad = () => {
          this._stateMachine.SetState('idle');
        };

        const loader = new FBXLoader(this._manager);
        loader.setPath('./resources/guard/');
        loader.load('Sword And Shield Idle.fbx', (a) => { _OnLoad('idle', a); });
        loader.load('Sword And Shield Run.fbx', (a) => { _OnLoad('run', a); });
        loader.load('Sword And Shield Walk.fbx', (a) => { _OnLoad('walk', a); });
        loader.load('Sword And Shield Slash.fbx', (a) => { _OnLoad('attack', a); });
        loader.load('Sword And Shield Death.fbx', (a) => { _OnLoad('death', a); });
      });
    }

    _FindIntersections(pos) {
      const _IsAlive = (c) => {
        const h = c.entity.GetComponent('HealthComponent');
        if (!h) {
          return true;
        }
        return h._health > 0;
      };

      const grid = this.GetComponent('SpatialGridController');
      const nearby = grid.FindNearbyEntities(5).filter(e => _IsAlive(e));
      const collisions = [];

      for (let i = 0; i < nearby.length; ++i) {
        const e = nearby[i].entity;
        const d = ((pos.x - e._position.x) ** 2 + (pos.z - e._position.z) ** 2) ** 0.5;

        // HARDCODED
        if (d <= 4) {
          collisions.push(nearby[i].entity);
        }
      }
      return collisions;
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      const input = this.GetComponent('BasicCharacterControllerInput');
      this._stateMachine.Update(timeInSeconds, input);

      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }

      const currentState = this._stateMachine._currentState;
      if (currentState.Name != 'walk' &&
        currentState.Name != 'run' &&
        currentState.Name != 'idle' &&
        currentState.Name != 'attack') {
          console.log(`The current state is ${currentState.Name} so we can't do movement things.`);
        return;
      }

      const MAX_CAMERA_DISTANCE = 100;
      const MIN_CAMERA_DISTANCE = 5;

      if (input._wheelDelta) {
        this._CameraDistance -= .01 * input._wheelDelta;
        if (this._CameraDistance > MAX_CAMERA_DISTANCE) {
          this._CameraDistance = MAX_CAMERA_DISTANCE;
        } else if (this._CameraDistance < MIN_CAMERA_DISTANCE) {
          this._CameraDistance = MIN_CAMERA_DISTANCE;
        }
        input._wheelDelta = 0;
      }

      const velocity = this._velocity;
      const frameDecceleration = new THREE.Vector3(
        velocity.x * this._decceleration.x,
        velocity.y * this._decceleration.y,
        velocity.z * this._decceleration.z
      );
      frameDecceleration.multiplyScalar(timeInSeconds);
      frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

      velocity.add(frameDecceleration);

      const controlObject = this._target;
      const _QFollowY = new THREE.Quaternion();
      const _AFollowY = new THREE.Vector3();
      const _QFollowX = new THREE.Quaternion();
      const _AFollowX = new THREE.Vector3();
      const _RFollow = this._FollowQuaternion.clone();

      const _QFreeLookY = new THREE.Quaternion();
      const _AFreeLookY = new THREE.Vector3();
      const _QFreeLookX = new THREE.Quaternion();
      const _AFreeLookX = new THREE.Vector3();
      const _RFreeLook = this._FreeLookQuaternion.clone();

      const _RControlObject = controlObject.quaternion.clone();
      const _RFreeControlObject = this._FreeControlQuaternion.clone();

      const acc = this._acceleration.clone();
      if (input._keys.shift) {
        acc.multiplyScalar(2.0);
      }

      if (input._keys.forward || input._keys.mouseforward) {
        velocity.z += acc.z * timeInSeconds;
      }
      if (input._keys.backward) {
        velocity.z -= acc.z * timeInSeconds;
      }

      this._WasFreeLook = this._IsFreeLook;
      if (input._mouseDownRight) {
        // both could be down, or just right could be down
        this._IsFreeLook = false;
      }
      else if (input._mouseDownLeft) {
        // ONLY left is down
        this._IsFreeLook = true;
      }

      if (this._IsFreeLook != this._WasFreeLook) {
        // Player Update Fires before Camera Update
        // console.log(`Player: _WasFreeLook = ${this._WasFreeLook}`);
        // console.log(`Player: _IsFreeLook = ${this._IsFreeLook}`);
      }

      const xMove = input._mouseMovementX * -.01;
      const yMove = input._mouseMovementY * .01;

      if (input._mouseDownRight) {
        if (input._mouseMovementX || input._mouseMovementY) {
          _AFollowY.set(0, 1, 0);
          _QFollowY.setFromAxisAngle(_AFollowY, 4.0 * Math.PI * xMove * this._acceleration.y);
          _AFollowX.set(1, 0, 0);
          _QFollowX.setFromAxisAngle(_AFollowX, 4.0 * Math.PI * yMove * this._acceleration.y);
          _RFollow.multiply(_QFollowY);
          _RFollow.multiply(_QFollowX);
          _RControlObject.multiply(_QFollowY);
          input._mouseMovementX = 0;
          input._mouseMovementY = 0;
        }
      } else {
        if (input._mouseDownLeft) {
          if (input._mouseMovementX || input._mouseMovementY) {
            _AFreeLookY.set(0, 1, 0);
            _QFreeLookY.setFromAxisAngle(_AFreeLookY, 4.0 * Math.PI * xMove * this._acceleration.y);
            _AFreeLookX.set(1, 0, 0);
            _QFreeLookX.setFromAxisAngle(_AFreeLookX, 4.0 * Math.PI * yMove * this._acceleration.y);
            _RFreeLook.multiply(_QFreeLookY);
            _RFreeLook.multiply(_QFreeLookX);
            _RFreeControlObject.multiply(_QFreeLookY);
            input._mouseMovementX = 0;
            input._mouseMovementY = 0;
          }
        }

        if (input._keys.left) {
          _AFollowY.set(0, 1, 0);
          _QFollowY.setFromAxisAngle(_AFollowY, 6.0 * Math.PI * timeInSeconds * this._acceleration.y);
          _RFollow.multiply(_QFollowY);
          _RControlObject.multiply(_QFollowY);
        }
        if (input._keys.right) {
          _AFollowY.set(0, 1, 0);
          _QFollowY.setFromAxisAngle(_AFollowY, 6.0 * -Math.PI * timeInSeconds * this._acceleration.y);
          _RFollow.multiply(_QFollowY);
          _RControlObject.multiply(_QFollowY);
        }
      }

      if (!this._IsFreeLook) {
        if (this._WasFreeLook) {
          _RFollow.copy(_RFreeLook);
          _RControlObject.copy(_RFreeControlObject);
        } else {
          //console.log(`oof`);
          _RFreeLook.copy(_RFollow);
          _RFreeControlObject.copy(_RControlObject);
        }
      }

      controlObject.quaternion.copy(_RControlObject);
      this._FreeControlQuaternion.copy(_RFreeControlObject);
      this._FollowQuaternion.copy(_RFollow);
      this._FreeLookQuaternion.copy(_RFreeLook);

      const oldPosition = new THREE.Vector3();
      oldPosition.copy(controlObject.position);

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();

      const sideways = new THREE.Vector3(1, 0, 0);
      sideways.applyQuaternion(controlObject.quaternion);
      sideways.normalize();

      sideways.multiplyScalar(velocity.x * timeInSeconds);
      forward.multiplyScalar(velocity.z * timeInSeconds);

      const pos = controlObject.position.clone();
      pos.add(forward);
      pos.add(sideways);

      const collisions = this._FindIntersections(pos);
      if (collisions.length > 0) {
        return;
      }

      controlObject.position.copy(pos);
      this._position.copy(pos);

      this._parent.SetPosition(this._position);
      this._parent.SetQuaternion(this._target.quaternion);
    }
  };

  return {
    BasicCharacterControllerProxy: BasicCharacterControllerProxy,
    BasicCharacterController: BasicCharacterController,
  };

})();