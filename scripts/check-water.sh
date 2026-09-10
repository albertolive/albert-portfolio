#!/bin/sh
set -eu
agent-browser --session water-check open "${1:-http://localhost:3000}/projects"
agent-browser --session water-check eval 'const canvas=document.querySelector("canvas");const gl=canvas.getContext("webgl");if(!gl)throw Error("WebGL unavailable");window.waterDraws=0;window.waterInputs=0;const draw=gl.drawArrays.bind(gl);gl.drawArrays=(...args)=>{window.waterDraws++;draw(...args)};const uniform=gl.uniform4fv.bind(gl);gl.uniform4fv=(location,values)=>{if(values.some(value=>value>0))window.waterInputs++;uniform(location,values)};window.dispatchEvent(new PointerEvent("pointerdown",{clientX:100,clientY:100}));new Promise((resolve,reject)=>setTimeout(()=>window.waterDraws>0&&window.waterInputs>0?resolve("Water renders and accepts ripples"):reject(Error("Water did not render ripples")),500))'
agent-browser --session water-check set media light reduced-motion
agent-browser --session water-check eval 'const before=window.waterDraws;new Promise((resolve,reject)=>setTimeout(()=>window.waterDraws===before?resolve("Reduced motion stops rendering"):reject(Error("Water still animates")),300))'
agent-browser --session water-check set viewport 390 844
agent-browser --session water-check eval 'if(document.documentElement.scrollWidth>innerWidth)throw Error("Horizontal overflow");"Mobile fits"'
agent-browser --session water-check errors
agent-browser --session water-check close
