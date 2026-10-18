uniform float uTime,uSeed,uStyle,uDisplacement,uComplexity;
uniform int uOctaves;
uniform bool uProcedural;
uniform int uNoiseType;
uniform float uAmplitude,uSharpness,uOffset,uPeriod,uPersistence,uLacunarity,uRelief,uBumpStrength,uBumpOffset;
float terrain(vec3 p){
  vec3 q=p+vec3(uSeed,0.,0.);
  if(uProcedural)return terrainHeight(uNoiseType,q,uAmplitude,uSharpness,uOffset,uPeriod,uPersistence,uLacunarity,uOctaves);
  if(uStyle>1.5){
    // Broad mineral relief plus restrained microdetail. The old ridged fractal
    // amplified tiny slopes into crumpled, glittering normals at close range.
    q+=vec3(simplex3(q*2.3),simplex3(q*2.3+11.),simplex3(q*2.3-7.))*.08;
    float broad=simplex3(q*2.6)*.5+.5;
    float ridge=pow(1.-abs(simplex3(q*7.)),2.);
    return broad*.7+ridge*.18+(simplex3(q*21.)*.5+.5)*.06+(simplex3(q*57.)*.5+.5)*.008;
  }
  // Adapted from Greenheck's terrainHeight/fractal3, preserving its scales.
  return terrainHeight(2,q,1.19,2.6,-.016,uStyle<.5?.6:.42,.484,1.8,uOctaves);
}
float elevation(vec3 p){
  float h=terrain(p),height=h*uDisplacement*.32;
  if(uProcedural){
    // Upstream radius=20 becomes 1; h/20 is the original displacement scale.
    height=h*uRelief;
    if(uStyle>.5&&uStyle<1.5)height-=uRelief*mix(.035,.3,uFractureB.z)*fractureMask(fractureField(p));
    return min(height,.32);
  }
  if(uStyle>.5&&uStyle<1.5){float cut=fractureMask(fractureField(p));height=log(1.+h)*uDisplacement*.25-uDisplacement*mix(.035,.3,uFractureB.z)*cut;}
  else if(uStyle>1.5)height=(h-.35)*uDisplacement*.38;
  return height;
}
vec3 surfacePoint(vec3 p){return p*(1.+elevation(p));}
