/* OpenCV runs in this same-origin classic worker; no document data leaves Trade. */
let engine;
async function openCv(){
 if(!engine)engine=(async()=>{
  importScripts('/ocr/opencv.js');
  const module=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('OpenCV no inició.')),20000);
   const ready=value=>{const cv=value||self.cv;if(!cv?.Mat)return;clearTimeout(timeout);if(cv.then)delete cv.then;resolve(cv)};
   if(self.cv?.Mat)ready(self.cv);
   else if(self.cv?.then)self.cv.then(ready,reject);
   else if(self.cv)self.cv.onRuntimeInitialized=()=>ready(self.cv);
   else{clearTimeout(timeout);reject(Error('OpenCV no disponible.'))}
  });
  return module;
 })();
 return engine;
}
function corners(points){
 const ordered=[...points].sort((a,b)=>a.y-b.y);
 const top=ordered.slice(0,2).sort((a,b)=>a.x-b.x),bottom=ordered.slice(2).sort((a,b)=>a.x-b.x);
 return [top[0],top[1],bottom[1],bottom[0]];
}
self.onmessage=async({data})=>{
 const {id,file}=data;const allocated=[];let bitmap;
 const keep=mat=>(allocated.push(mat),mat);
 try{
  const cv=await openCv();bitmap=await createImageBitmap(file);
  if(bitmap.width*bitmap.height>40000000)throw Error('Imagen demasiado grande.');
  const ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));
  const canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*ratio)),Math.max(1,Math.round(bitmap.height*ratio)));
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const src=keep(cv.matFromImageData(ctx.getImageData(0,0,canvas.width,canvas.height)));
  const gray=keep(new cv.Mat());cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
  const warnings=[];
  if(Math.max(bitmap.width,bitmap.height)<1000)warnings.push('low-resolution');
  const mean=keep(new cv.Mat()),std=keep(new cv.Mat());cv.meanStdDev(gray,mean,std);
  if(mean.data64F[0]<40)warnings.push('dark');
  if(mean.data64F[0]>245)warnings.push('overexposed');
  if(std.data64F[0]<20)warnings.push('low-contrast');
  const lap=keep(new cv.Mat()),lapMean=keep(new cv.Mat()),lapStd=keep(new cv.Mat());cv.Laplacian(gray,lap,cv.CV_64F);cv.meanStdDev(lap,lapMean,lapStd);
  if(lapStd.data64F[0]**2<30)warnings.push('blur');
  const smooth=keep(new cv.Mat()),edges=keep(new cv.Mat());
  cv.GaussianBlur(gray,smooth,new cv.Size(5,5),0);cv.Canny(smooth,edges,45,140);
  const contours=keep(new cv.MatVector()),hierarchy=keep(new cv.Mat());cv.findContours(edges,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
  let best=null,area=src.rows*src.cols*.25;
  for(let i=0;i<contours.size();i++){
   const contour=contours.get(i),approx=new cv.Mat();
   try{
    cv.approxPolyDP(contour,approx,.02*cv.arcLength(contour,true),true);
    const candidateArea=Math.abs(cv.contourArea(approx));
    if(approx.rows===4&&cv.isContourConvex(approx)&&candidateArea>area){
     const p=[];for(let n=0;n<4;n++)p.push({x:approx.data32S[n*2],y:approx.data32S[n*2+1]});
     const sorted=corners(p),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
     const aspect=distance(sorted[0],sorted[1])/distance(sorted[0],sorted[3]);
     if(aspect>1.25&&aspect<2.1){best=sorted;area=candidateArea}
    }
   }finally{approx.delete();contour.delete()}
  }
  let aligned=gray;
  if(best){
   const from=keep(cv.matFromArray(4,1,cv.CV_32FC2,best.flatMap(p=>[p.x,p.y])));
   const to=keep(cv.matFromArray(4,1,cv.CV_32FC2,[0,0,1799,0,1799,1134,0,1134]));
   const transform=keep(cv.getPerspectiveTransform(from,to));aligned=keep(new cv.Mat());
   cv.warpPerspective(gray,aligned,transform,new cv.Size(1800,1135),cv.INTER_CUBIC,cv.BORDER_REPLICATE);
  }else{
   // Correct small rotations even when the photograph has no visible card border.
   const lines=keep(new cv.Mat());cv.HoughLinesP(edges,lines,1,Math.PI/180,80,src.cols*.2,20);
   const angles=[];
   for(let i=0;i<lines.rows;i++){const a=lines.data32S.slice(i*4,i*4+4);const angle=Math.atan2(a[3]-a[1],a[2]-a[0])*180/Math.PI;if(Math.abs(angle)<15)angles.push(angle)}
   if(angles.length){angles.sort((a,b)=>a-b);const angle=angles[Math.floor(angles.length/2)];if(Math.abs(angle)>.4){
    aligned=keep(new cv.Mat());const matrix=keep(cv.getRotationMatrix2D(new cv.Point(gray.cols/2,gray.rows/2),angle,1));
    cv.warpAffine(gray,aligned,matrix,new cv.Size(gray.cols,gray.rows),cv.INTER_CUBIC,cv.BORDER_REPLICATE);
   }}
  }
  async function asBlob(mat){
   const rgba=new cv.Mat();try{cv.cvtColor(mat,rgba,cv.COLOR_GRAY2RGBA);const output=new OffscreenCanvas(rgba.cols,rgba.rows);output.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.data),rgba.cols,rgba.rows),0,0);return await output.convertToBlob({type:'image/png'})}finally{rgba.delete()}
  }
  const binary=keep(new cv.Mat());cv.adaptiveThreshold(aligned,binary,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY,41,13);
  const blob=await asBlob(aligned),binaryBlob=await asBlob(binary);
  self.postMessage({id,blob,binaryBlob,warnings:[...new Set(warnings)]});
 }catch{self.postMessage({id,error:'No se pudo mejorar la imagen. Prueba otra captura.'})}
 finally{bitmap?.close();for(const mat of allocated.reverse())mat.delete()}
};
