/** Direct manipulation follows the latest input; presets may ease into position. */
export function advanceExplode(current:number,target:number,immediate:boolean,reducedMotion:boolean):{value:number;animate:boolean} {
  const delta=target-current;
  const animate=!immediate&&!reducedMotion&&Math.abs(delta)>0.002;
  return {value:animate?current+delta*0.18:target,animate};
}
