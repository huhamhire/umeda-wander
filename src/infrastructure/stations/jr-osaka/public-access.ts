import {jrGroundPoint} from './geographic.ts';
/** Public cross-floor anchors from JR pp5–6, in the calibrated ground frame.
 * Numbering is the source diagram's reference only; positions are estimates.
 */
export function jrPublicAccessAnchors(){
  return {
    banks:[{reference:'75',b1:jrGroundPoint({x:9,z:-51}),ground:jrGroundPoint({x:9,z:-41})},
      {reference:'76',b1:jrGroundPoint({x:14,z:-51}),ground:jrGroundPoint({x:14,z:-41})}],
    lift:jrGroundPoint({x:20,z:-51}),liftGroundJoin:jrGroundPoint({x:20,z:-41}),
    metroStairs:{ground:jrGroundPoint({x:56,z:-18}),b1:{x:563,z:521}},
  };
}
