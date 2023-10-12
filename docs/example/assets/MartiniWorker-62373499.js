var It=Object.defineProperty;var Bt=(X,j,G)=>j in X?It(X,j,{enumerable:!0,configurable:!0,writable:!0,value:G}):X[j]=G;var B=(X,j,G)=>(Bt(X,typeof j!="symbol"?j+"":j,G),G);(function(){"use strict";const $=class{constructor(){B(this,"_controller",new AbortController);B(this,"listeners",new Set)}fetch(t,n={}){$.pendings.has(t)||($.pendings.set(t,this),fetch(t,{...n,signal:this._controller.signal}).then(e=>{this.listeners.forEach(o=>o.resolve(e.clone()))}).catch(e=>{this.listeners.forEach(o=>o.reject(e))}).finally(()=>{$.pendings.delete(t)}))}abort(){this._controller.abort()}};let X=$;B(X,"pendings",new Map);class j{constructor(t,n){B(this,"resolve");B(this,"reject");B(this,"promise");this.url=t,this.init=n,this.promise=new Promise((e,o)=>{this.resolve=e,this.reject=o})}ready(){let t=X.pendings.get(this.url);return t||(t=new X,t.fetch(this.url,this.init)),t.listeners.add(this),this.promise}abort(){this.reject("User abort.");const t=X.pendings.get(this.url);t&&(t.listeners.delete(this),t.listeners.size===0&&t.abort())}}class G{constructor(t=257){B(this,"gridSize");B(this,"numTriangles");B(this,"numParentTriangles");B(this,"indices");B(this,"coords");this.gridSize=t;const n=t-1;if(n&n-1)throw new Error(`Expected grid size to be 2^n+1, got ${t}.`);this.numTriangles=n*n*2-2,this.numParentTriangles=this.numTriangles-n*n,this.indices=new Uint32Array(this.gridSize*this.gridSize),this.coords=new Uint16Array(this.numTriangles*4);for(let e=0;e<this.numTriangles;e++){let o=e+2,r=0,a=0,i=0,c=0,h=0,f=0;for(o&1?i=c=h=n:r=a=f=n;(o>>=1)>1;){const u=r+i>>1,M=a+c>>1;o&1?(i=r,c=a,r=h,a=f):(r=i,a=c,i=h,c=f),h=u,f=M}const g=e*4;this.coords[g+0]=r,this.coords[g+1]=a,this.coords[g+2]=i,this.coords[g+3]=c}}createTile(t){return new ct(t,this)}}class ct{constructor(t,n){B(this,"terrain");B(this,"martini");B(this,"errors");const e=n.gridSize;if(t.length!==e*e)throw new Error(`Expected terrain data of length ${e*e} (${e} x ${e}), got ${t.length}.`);this.terrain=t,this.martini=n,this.errors=new Float32Array(t.length),this.update()}update(){const{numTriangles:t,numParentTriangles:n,coords:e,gridSize:o}=this.martini,{terrain:r,errors:a}=this;for(let i=t-1;i>=0;i--){const c=i*4,h=e[c+0],f=e[c+1],g=e[c+2],u=e[c+3],M=h+g>>1,p=f+u>>1,v=M+p-f,w=p+h-M,S=(r[f*o+h]+r[u*o+g])/2,l=p*o+M,b=Math.abs(S-r[l]);if(a[l]=Math.max(a[l],b),i<n){const d=(f+w>>1)*o+(h+v>>1),P=(u+w>>1)*o+(g+v>>1);a[l]=Math.max(a[l],a[d],a[P])}}}getMesh(t=0){const{gridSize:n,indices:e}=this.martini,{errors:o}=this;let r=0,a=0;const i=n-1;e.fill(0);function c(M,p,v,w,S,l){const b=M+v>>1,d=p+w>>1;Math.abs(M-S)+Math.abs(p-l)>1&&o[d*n+b]>t?(c(S,l,M,p,b,d),c(v,w,S,l,b,d)):(e[p*n+M]=e[p*n+M]||++r,e[w*n+v]=e[w*n+v]||++r,e[l*n+S]=e[l*n+S]||++r,a++)}c(0,0,i,i,i,0),c(i,i,0,0,0,i);const h=new Uint16Array(r*2),f=new Uint32Array(a*3);let g=0;function u(M,p,v,w,S,l){const b=M+v>>1,d=p+w>>1;if(Math.abs(M-S)+Math.abs(p-l)>1&&o[d*n+b]>t)u(S,l,M,p,b,d),u(v,w,S,l,b,d);else{const P=e[p*n+M]-1,A=e[w*n+v]-1,E=e[l*n+S]-1;h[2*P]=M,h[2*P+1]=p,h[2*A]=v,h[2*A+1]=w,h[2*E]=S,h[2*E+1]=l,f[g++]=P,f[g++]=A,f[g++]=E}}return u(0,0,i,i,i,0),u(i,i,0,0,0,i),{vertices:h,triangles:f}}getMeshWithSkirts(t=0){const{gridSize:n,indices:e}=this.martini,{errors:o}=this;let r=0,a=0;const i=n-1;let c,h,f=0,g=[],u=[],M=[],p=[];e.fill(0);function v(m,T,I,F,O,k){const U=m+I>>1,q=T+F>>1;Math.abs(m-O)+Math.abs(T-k)>1&&o[q*n+U]>t?(v(O,k,m,T,U,q),v(I,F,O,k,U,q)):(c=T*n+m,h=F*n+I,f=k*n+O,e[c]===0&&(m===0?g.push(r):m===i&&u.push(r),T===0?M.push(r):T===i&&p.push(r),e[c]=++r),e[h]===0&&(I===0?g.push(r):I===i&&u.push(r),F===0?M.push(r):F===i&&p.push(r),e[h]=++r),e[f]===0&&(O===0?g.push(r):O===i&&u.push(r),k===0?M.push(r):k===i&&p.push(r),e[f]=++r),a++)}v(0,0,i,i,i,0),v(i,i,0,0,0,i);const w=(r+g.length+u.length+M.length+p.length)*2,S=(a+(g.length-1)*2+(u.length-1)*2+(M.length-1)*2+(p.length-1)*2)*3,l=new Uint16Array(w),b=new Uint32Array(S);let d=0;function P(m,T,I,F,O,k){const U=m+I>>1,q=T+F>>1;if(Math.abs(m-O)+Math.abs(T-k)>1&&o[q*n+U]>t)P(O,k,m,T,U,q),P(I,F,O,k,U,q);else{const H=e[T*n+m]-1,J=e[F*n+I]-1,N=e[k*n+O]-1;l[2*H]=m,l[2*H+1]=T,l[2*J]=I,l[2*J+1]=F,l[2*N]=O,l[2*N+1]=k,b[d++]=H,b[d++]=J,b[d++]=N}}P(0,0,i,i,i,0),P(i,i,0,0,0,i),g.sort((m,T)=>l[2*m+1]-l[2*T+1]),u.sort((m,T)=>l[2*T+1]-l[2*m+1]),M.sort((m,T)=>l[2*T]-l[2*m]),p.sort((m,T)=>l[2*m]-l[2*T]);let A=r*2,E,V,x,R,W=0;function D(m){W=m.length;for(var T=0;T<W-1;T++)E=m[T],V=m[T+1],x=A/2,R=(A+2)/2,l[A++]=l[2*E],l[A++]=l[2*E+1],b[d++]=E,b[d++]=x,b[d++]=V,b[d++]=x,b[d++]=R,b[d++]=V;l[A++]=l[2*m[W-1]],l[A++]=l[2*m[W-1]+1]}return D(g),D(u),D(M),D(p),{vertices:l,triangles:b,numVerticesWithoutSkirts:r}}}var lt=Math.PI/180,ht=180/Math.PI;function Q(s){var t=Z(s[0]+1,s[2]),n=Z(s[0],s[2]),e=K(s[1]+1,s[2]),o=K(s[1],s[2]);return[n,e,t,o]}function ft(s){var t=Q(s),n={type:"Polygon",coordinates:[[[t[0],t[3]],[t[0],t[1]],[t[2],t[1]],[t[2],t[3]],[t[0],t[3]]]]};return n}function Z(s,t){return s/Math.pow(2,t)*360-180}function K(s,t){var n=Math.PI-2*Math.PI*s/Math.pow(2,t);return ht*Math.atan(.5*(Math.exp(n)-Math.exp(-n)))}function y(s,t,n){var e=st(s,t,n);return e[0]=Math.floor(e[0]),e[1]=Math.floor(e[1]),e}function Y(s){return[[s[0]*2,s[1]*2,s[2]+1],[s[0]*2+1,s[1]*2,s[2]+1],[s[0]*2+1,s[1]*2+1,s[2]+1],[s[0]*2,s[1]*2+1,s[2]+1]]}function tt(s){return[s[0]>>1,s[1]>>1,s[2]-1]}function et(s){return Y(tt(s))}function ut(s,t){for(var n=et(s),e=0;e<n.length;e++)if(!nt(t,n[e]))return!1;return!0}function nt(s,t){for(var n=0;n<s.length;n++)if(rt(s[n],t))return!0;return!1}function rt(s,t){return s[0]===t[0]&&s[1]===t[1]&&s[2]===t[2]}function gt(s){for(var t="",n=s[2];n>0;n--){var e=0,o=1<<n-1;s[0]&o&&e++,s[1]&o&&(e+=2),t+=e.toString()}return t}function dt(s){for(var t=0,n=0,e=s.length,o=e;o>0;o--){var r=1<<o-1,a=+s[e-o];a===1&&(t|=r),a===2&&(n|=r),a===3&&(t|=r,n|=r)}return[t,n,e]}function Mt(s){var t=y(s[0],s[1],32),n=y(s[2],s[3],32),e=[t[0],t[1],n[0],n[1]],o=pt(e);if(o===0)return[0,0,0];var r=e[0]>>>32-o,a=e[1]>>>32-o;return[r,a,o]}function pt(s){for(var t=28,n=0;n<t;n++){var e=1<<32-(n+1);if((s[0]&e)!==(s[2]&e)||(s[1]&e)!==(s[3]&e))return n}return t}function st(s,t,n){var e=Math.sin(t*lt),o=Math.pow(2,n),r=o*(s/360+.5),a=o*(.5-.25*Math.log((1+e)/(1-e))/Math.PI);return r=r%o,r<0&&(r=r+o),[r,a,n]}var L={tileToGeoJSON:ft,tileToBBOX:Q,getChildren:Y,getParent:tt,getSiblings:et,hasTile:nt,hasSiblings:ut,tilesEqual:rt,tileToQuadkey:gt,quadkeyToTile:dt,pointToTile:y,bboxToTile:Mt,pointToTileFraction:st};const it="merc",ot=6378137,at=Math.PI/180;function mt(s,t){const n=ot*s*at,e=ot*Math.log(Math.tan(Math.PI*.25+t*at*.5));return[n,e]}function C(s){return s*Math.PI/180}const Tt={a:6378137,b:6356752314245e-6,f:1/298.257223563},vt="CDEFGHJKLMNPQRSTUVWXX",wt=5e5,St=1e7;function bt(s,t,n){if(!(-80<=t&&t<=84))throw new RangeError(`latitude ‘${t}’ outside UTM limits`);let e=n||Math.floor((s+180)/6)+1,o=C((e-1)*6-180+3);const r=vt.charAt(Math.floor(t/8+10));e===31&&r==="V"&&s>=3?(e++,o+=C(6)):e===32&&r==="X"&&s<9?(e--,o-=C(6)):e===32&&r==="X"&&s>=9?(e++,o+=C(6)):e===34&&r==="X"&&s<21?(e--,o-=C(6)):e===34&&r==="X"&&s>=21?(e++,o+=C(6)):e===36&&r==="X"&&s<33?(e--,o-=C(6)):e===36&&r==="X"&&s>=33&&(e++,o+=C(6));const a=C(t),i=C(s)-o,{a:c,f:h}=Tt,f=.9996,g=Math.sqrt(h*(2-h)),u=h/(2-h),M=u*u,p=u*M,v=u*p,w=u*v,S=u*w,l=Math.cos(i),b=Math.sin(i),d=Math.tan(a),P=Math.sinh(g*Math.atanh(g*d/Math.sqrt(1+d*d))),A=d*Math.sqrt(1+P*P)-P*Math.sqrt(1+d*d),E=Math.atan2(A,l),V=Math.asinh(b/Math.sqrt(A*A+l*l)),x=c/(1+u)*(1+1/4*M+1/64*v+1/256*S),R=[null,1/2*u-2/3*M+5/16*p+41/180*v-127/288*w+7891/37800*S,13/48*M-3/5*p+557/1440*v+281/630*w-1983433/1935360*S,61/240*p-103/140*v+15061/26880*w+167603/181440*S,49561/161280*v-179/168*w+6601661/7257600*S,34729/80640*w-3418889/1995840*S,212378941/319334400*S];let W=E;for(let I=1;I<=6;I++)W+=R[I]*Math.sin(2*I*E)*Math.cosh(2*I*V);let D=V;for(let I=1;I<=6;I++)D+=R[I]*Math.cos(2*I*E)*Math.sinh(2*I*V);let m=f*x*D,T=f*x*W;return m=m+wt,T<0&&(T=T+St),[m,T]}class _{static getFromBitmap(t,n=256){this.offscreencanvas||(this.offscreencanvas=new OffscreenCanvas(512,512));const e=this.offscreencanvas.getContext("2d");if(!e)throw new Error("Get context 2d error.");e.drawImage(t,0,0,n,n);const o=e.getImageData(0,0,n,n).data,r=n+1,a=new Float32Array(r*r);for(let i=0;i<n;i++)for(let c=0;c<n;c++){const h=(i*n+c)*4,f=o[h+0],g=o[h+1],u=o[h+2];a[i*r+c]=(f*256*256+g*256+u)/10-1e4}for(let i=0;i<r-1;i++)a[r*(r-1)+i]=a[r*(r-2)+i];for(let i=0;i<r;i++)a[r*i+r-1]=a[r*i+r-2];return a}static clip(t,n,e,o,r){if(e+r>n+1||o+r>n+1)throw console.log("clip: ",e,o,r),new RangeError("Clip terrain error");const a=r+1,i=n+1,c=new Float32Array(a*a);for(let h=0;h<a;h++)for(let f=0;f<a;f++)c[h*a+f]=t[(h+o)*i+(f+e)];return c}static getChildPosition(t,n,e){const o=L.tileToBBOX(t),r=L.tileToBBOX(e),a=o[2]-o[0],i=o[3]-o[1],c=(r[0]-o[0])/a,h=(o[3]-r[3])/i,f=Math.round(c*n),g=Math.round(h*n);return{x:f,y:g,bigBbox:o,smallBbox:r}}}B(_,"offscreencanvas");class z{static getMartini(t){let n=this.martiniMap.get(t);return n||(n=new G(t+1),this.martiniMap.set(t,n)),n}static findAncestorTerrainData(t,n){const e=t[2];let o,r=t;const a=e>=n?e-n:5;for(let i=0;i<a;i++){r=L.getParent(r);const c=this.terrainDataMap.get(r.join("-"));if(c){o=c;break}}return{terrain:o,tileNo:r}}static async getTerrainData(t,n,e){const o=t.join("-"),{baseSize:r}=this,{terrain:a,tileNo:i}=this.findAncestorTerrainData(t,e);if(a){let h=t[2]-i[2],f=this.baseSize;for(;h>0;)f=f/2,h--;const{x:g,y:u,smallBbox:M}=_.getChildPosition(i,r,t);return{terrain:_.clip(a,r,g,u,f),size:f,bbox:M}}const c=new j(n,{cache:"force-cache"});this.fetchingMap.set(o,c);try{const f=await(await c.ready()).blob(),g=await createImageBitmap(f),u=_.getFromBitmap(g,r);return this.terrainDataMap.set(o,u),{terrain:u,size:r,bbox:L.tileToBBOX(t)}}finally{this.fetchingMap.delete(o)}}static async getTileGeometryAttributes(t,n,e,o=it,r){const{terrain:a,size:i,bbox:c}=await this.getTerrainData(t,n,e),f=this.getMartini(i).createTile(a),{vertices:g,triangles:u,numVerticesWithoutSkirts:M}=f.getMeshWithSkirts(10),p=g.length/2,v=new Float32Array(p*3),w=new Float32Array(p*2),S=t[2],l=i+1,b=o===it?mt:bt;for(let d=0;d<p;d++){const P=g[2*d],A=g[2*d+1],E=A*l+P,V=(c[2]-c[0])*P/i+c[0],x=(c[3]-c[1])*(i-A)/i+c[1],[R,W]=b(V,x,r),D=a[E],m=(21-S)*10;v[3*d]=R,v[3*d+1]=W,v[3*d+2]=d>=M?D-m:D,w[2*d+0]=P/i,w[2*d+1]=(i-A)/i}return{positions:v,uv:w,triangles:u}}}B(z,"terrainDataMap",new Map),B(z,"fetchingMap",new Map),B(z,"martiniMap",new Map),B(z,"baseSize",512),self.onmessage=async s=>{var h;const{id:t,tileNo:n,maxZ:e,url:o,coordType:r,utmZone:a,abort:i,dispose:c}=s.data;if(i){(h=z.fetchingMap.get(t))==null||h.abort(),z.fetchingMap.delete(t),self.postMessage({id:t,error:!0});return}if(c){z.terrainDataMap.delete(t);return}try{const{positions:f,uv:g,triangles:u}=await z.getTileGeometryAttributes(n,o,e,r,a),M=[f.buffer,g.buffer,u.buffer];self.postMessage({id:t,positions:f,uv:g,triangles:u},M)}finally{z.fetchingMap.delete(t)}}})();