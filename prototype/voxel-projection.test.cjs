const assert=require('node:assert/strict');
(async()=>{
 global.window={officeVoxelWorld:require('./voxel-world.js')};
 const {toThree,paletteNames}=await import('./voxel-renderer.mjs');
 const T=await import('./vendor/three/three.module.js'),W=window.officeVoxelWorld;
 assert.deepEqual(toThree(W.point(2,3,4)).toArray(),[2,4,-3]);
 const camera=new T.OrthographicCamera(-10,10,10,-10,.1,100);
 camera.position.set(20*Math.cos(Math.PI/6)/Math.sqrt(2),10,20*Math.cos(Math.PI/6)/Math.sqrt(2));camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const origin=toThree(W.point()).project(camera),x=toThree(W.point(1,0)).project(camera),y=toThree(W.point(0,1)).project(camera);
 assert.ok(Math.abs(Math.abs((x.x-origin.x)/(x.y-origin.y))-2)<1e-8);
 assert.ok(Math.abs(Math.abs((y.x-origin.x)/(y.y-origin.y))-2)<1e-8);
 const parent=new T.Group();parent.position.copy(toThree(W.point(2,3,1)));parent.rotation.y=Math.PI/2;
 const child=new T.Object3D();child.position.copy(toThree(W.point(1,.25,.75)));parent.add(child);parent.updateMatrixWorld();
 const actual=new T.Vector3();child.getWorldPosition(actual);const expected=toThree(W.plus(W.point(2,3,1),W.rotate(W.point(1,.25,.75),90)));
 assert.ok(actual.distanceTo(expected)<1e-8);
 assert.deepEqual(paletteNames,['daylight','sorbet']);
 console.log('voxel projection: real Three transform boundary, parent/socket rotation, orthographic 2:1 axes, conforming palettes PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
