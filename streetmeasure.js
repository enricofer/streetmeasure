
var raycaster = new THREE.Raycaster(); 
var mouse = new THREE.Vector2();
var pano_map
var depth_img, loaded;
var relative_positions;
var mesh, mesh_click;
var textureLoader = new THREE.TextureLoader();
var point_parameter = [
        [ 0xffffff, textureLoader.load( "sprites/marker_1.png" ), 10 ],
    ];
var point1_texture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAgY0hSTQAAeiYAAICEAAD6AAAAgOgAAHUwAADqYAAAOpgAABdwnLpRPAAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTFH80I3AAAAW0lEQVQ4T+2SwQoAIAhD9f8/eplkSUzvQYGX2tK9UgBCl+o5AJRqppmW2HZUoeHGKX7UHKNXTJxIznYDMsQbJtFxs3sWtBteuqTvnEemnZtMHqnN/D8Jf9eCywBg2TnnAAWR+wAAAABJRU5ErkJggg=='
var req_pano_id = gup('panoid');
var req_lon = gup('lon');
var req_lat = gup('lat');
var gsv = new google.maps.StreetViewService();
var pid;
var gui = new dat.GUI();;


var show_pano = false;
var show_depth = false;

var measures = [];
var distances = [];
var features = [];
var plan_definition;

var camera, scene, renderer;
        
var material_invisible, material_grid, material_visible;

var isUserInteracting = false,
onMouseDownMouseX = 0, onMouseDownMouseY = 0,
lon = 0, onMouseDownLon = 0,
lat = 0, onMouseDownLat = 0,
phi = 0, theta = 0;

init();
animate();


function png2depth_map(url){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = function(e){
        if (this.status == 200){
            var reader = new PNGReader(this.response);
            reader.parse(function(err, png){
                if (err) throw err;
                depth_img = png
                console.log('depth_map loaded');
                console.log(depth_map.getPixel(100,100));
            });
        }
    };

    xhr.send();
}

function convertCanvasToImage(canvas) {
    var image = new Image();
    image.src = canvas.toDataURL("image/png");
    return image;
}

function toDataUrl(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = 'blob';
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.send();
}

function gup(name)
{
  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var results = regex.exec( window.location.href );
  if( results == null )
    return "";
  else
    return results[1];
}

function my_location() {
    clear_input();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
                render_street_view_by_location(position.coords.latitude, position.coords.longitude);
                cur_lat = position.coords.latitude;
                cur_lng = position.coords.longitude;
            },
            function () {
                render_street_view_by_location(default_lat, default_lng);
            });
    } else {
        render_street_view_by_location(default_lat, default_lng);
    }
}

function downloadCanvas(div, filename) {


    html2canvas(div, {
        onrendered: function(canvas) {

            link = document.createElement('a');
            document.body.appendChild(link);
            link.href = canvas.toDataURL();
            link.download = filename;
            link.click();
        }
    });

}

function cloneCanvas(oldCanvas) {

    //create a new canvas
    var newCanvas = document.createElement('canvas');
    var context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
}

function toScreenPosition (xyz_point, camera) {
    var vector = new THREE.Vector3(xyz_point.x,xyz_point.y,xyz_point.z);

    var widthHalf = 0.5*renderer.context.canvas.width;
    var heightHalf = 0.5*renderer.context.canvas.height;

    vector.project(camera);

    vector.x = ( vector.x * widthHalf ) + widthHalf;
    vector.y = - ( vector.y * heightHalf ) + heightHalf;

    return [vector.x,vector.y]

}

function extract_pattern () {

    for (i=0; i<features.length; ++i){
        scene.remove(features[i]);
    };
    features = [];
    update();
    var T_canvas = document.getElementById("container").firstChild;
    var extract_canvas = cloneCanvas(T_canvas);
    var pattern_container = document.getElementById('pattern_container');
    overlay_container = document.getElementById('overlay_container');
    pattern_container = document.getElementById('pattern_container');
    //pattern_container.style["z-index"] = 1000;
    while (pattern_container.firstChild) {
        pattern_container.removeChild(pattern_container.firstChild);
    };
    pattern_container.appendChild(extract_canvas);
    
    overlay_container.className = "show";

    //compute transformations
    var transf_array = []
    var trans_padding_factor = 0.1;
    var out_width = extract_canvas.offsetWidth;
    var out_height = extract_canvas.offsetHeight;
    var trans_axis_x = out_width*(1-trans_padding_factor);
    var trans_axis_y = out_height*(1-trans_padding_factor);

    // assuming ortho transformed input so calculating mean distance
    var mean_dist0 = (plan_definition.distances[0]+plan_definition.distances[2])/2;
    var mean_dist1 = (plan_definition.distances[1]+plan_definition.distances[3])/2;

    //trasform coordinates assuming screen x > screen y = landscape screen
    if (mean_dist0>mean_dist1){ 
    	var max_axis = trans_axis_x;
    	var min_axis = mean_dist1*max_axis/mean_dist0;
    } else {
    	var max_axis = trans_axis_y;
    	var min_axis = mean_dist0*max_axis/mean_dist1;
    }

    var trans_bl = [out_width/2-max_axis/2,out_height/2+min_axis/2];
    var trans_br = [out_width/2+max_axis/2,out_height/2+min_axis/2];
    var trans_tl = [out_width/2-max_axis/2,out_height/2-min_axis/2];
    var trans_tr = [out_width/2+max_axis/2,out_height/2-min_axis/2];

    var source_array = [];
    source_array.push(toScreenPosition(plan_definition.measures[0].view_point,camera)); //bottom-left origin point
    source_array.push(toScreenPosition(plan_definition.measures[1].view_point,camera)); //bottom-right axis_x_point
    source_array.push(toScreenPosition(plan_definition.measures[2].view_point,camera)); //top-right 
    source_array.push(toScreenPosition(plan_definition.measures[3].view_point,camera)); //top-left 

    var dest_array = [];
    dest_array.push(trans_bl); //bottom-left origin point
    dest_array.push(trans_br); //bottom-right axis_x_point
    dest_array.push(trans_tr); //top-right 
    dest_array.push(trans_tl); //top-left 

    function serialize_point_array(array){
        res = [];
        for (i=0; i<array.length; ++i){
            res.push(array[i][0]);
            res.push(array[i][1]);
        }
        return res;
    };
    //transform2d(extract_canvas,trasf_array);
    console.log(serialize_point_array(source_array));
    console.log(serialize_point_array(dest_array));

    var transform = PerspT(serialize_point_array(source_array), serialize_point_array(dest_array));
    var t = transform.coeffs;
        t = [t[0], t[3], 0, t[6],
        t[1], t[4], 0, t[7],
        0   , 0   , 1, 0   ,
        t[2], t[5], 0, t[8]];
    console.log(t);

    t = "matrix3d(" + t.join(", ") + ")";
    extract_canvas.style["-webkit-transform"] = t;
    extract_canvas.style["-webkit-transform-origin"] = "300 300";
    extract_canvas.style["-moz-transform"] = t;
    extract_canvas.style["-o-transform"] = t;
    extract_canvas.style.transform = t;
    extract_canvas.style["transform-origin"] = "top left";

    downloadCanvas(extract_canvas, 'projection.png');

}

function init() {

    $('#boxclose').click(function(event){
        event.stopPropagation();
        event.preventDefault();
        var overlay_container = document.getElementById('overlay_container');
        overlay_container.className = "hide";
    });

    $('#pattern_container').click(function(event){
        event.stopPropagation();
        event.preventDefault();
    });
    
    console.log (req_pano_id,parseFloat(req_lat), parseFloat(req_lon));

    if (req_pano_id != "") {
        build_pano(req_pano_id);
    } else {
        if ((req_lat != "") && (req_lon != "")) {
            var latLng = new google.maps.LatLng(parseFloat(req_lat), parseFloat(req_lon)); //{lat: parseFloat(req_lat), lng: parseFloat(req_lon)}
            gsv.getPanoramaByLocation( latLng, 50, 
                function (data, status) {
                    if (status === google.maps.StreetViewStatus.OK) {
                        console.log(data);
                        build_pano(data.location.pano);
                    } else {
                        console.error("Unable to get location");
                    };
            })
        } else {
            build_pano('XwEN7BBHM4xfgijOFnIdqQ');
        }
    }
}


function get_links( pano_id) {
    gui.destroy()
    gui = new dat.GUI();
    this[pano_id] = function () {
        console.log('baubau');
    }
    gui.add(this, pano_id).name(pano_id);
    gui.add(this, "show_pano", false).name("Show pano image").onChange(function (value) {
        if (value)
            document.getElementById("pano_container").className = "show";
        else
            document.getElementById("pano_container").className = "hide";
    });
    gui.add(this, "show_depth", false).name("Show depth map").onChange(function (value) {
        if (value)
            document.getElementById("depth_container").className = "show";
        else
            document.getElementById("depth_container").className = "hide";
    });
    gui.add(this, "show_pano", false).name("Show depth panorama").onChange(function (value) {
        if (value) {
            mesh_click.material = material_visible;
        }
        else {
            mesh_click.material = material_invisible;
        }
    });
    gui.add(this, "extract_pattern").name("extract_pattern");

    gsv.getPanorama({pano:pano_id},function (data,status){
        console.log(data.links);
        var f1 = gui.addFolder('Links');
        var gui_links = {}
        for (i=0; i<data.links.length; ++i) {
            var link = data.links[i];
            console.log(link);
            var label = link.heading.toFixed(2).toString()+' - '+link.description;
            gui_links[label] = function () {
                console.log(this.valueOf());
                build_pano(this.valueOf());
            };
            gui_links[label] = gui_links[label].bind(link.pano);
            f1.add(gui_links,label);
        }
    })

}

function build_pano( pano_id ) {

    //toDataUrl("http://172.25.193.167/jpann/point2.png", function(base64Img) {console.log(base64Img);});

    document.getElementById('info').innerHTML = "PANOID: "+pano_id

    get_links(pano_id);

    var pano_loader = new GSVPANO.PanoLoader({
        zoom: 2
    });
    var depth_loader = new GSVPANO.PanoDepthLoader();
    

    gsv.getPanoramaById(pano_id,
        function (data, status) {
            if (status === google.maps.StreetViewStatus.OK) {
                pano_loader.load(new google.maps.LatLng(data.location.latLng.lat(), data.location.latLng.lng()));
            } else {
                console.error("Unable to get starting pano ID ");
            }
        });

    //pano_loader.load(new google.maps.LatLng(lat, lon));
    

    pano_loader.onError = function(message){
        console.log('PanoLoaderError:' + message)
    };


    pano_loader.onPanoramaLoad = function () {
        console.log("pano_loaded_start");

        var pano_container = document.getElementById('pano_container');
        while (pano_container.firstChild) {
            pano_container.removeChild(pano_container.firstChild);
        }
        this.canvas.id='pano_canvas';
        pano_container.appendChild(this.canvas);

        var container;
        container = document.getElementById( 'container' );
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1100 );
        camera.target = new THREE.Vector3( 0, 0, 0 );

        scene = new THREE.Scene();

        var geometry = new THREE.SphereGeometry( 500, 120, 80 );
        geometry.scale( 1, 1, 1 );
        
        var pano_texture = new THREE.Texture(this.canvas);

        var material = new THREE.MeshBasicMaterial( {
            //map: new THREE.TextureLoader().load( 'test.png' ),
            map: pano_texture,
            side: THREE.DoubleSide
        } );
        
        pano_texture.needsUpdate = true;

        mesh = new THREE.Mesh( geometry, material );
        scene.add( mesh );

        renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true 
        });
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        container.appendChild( renderer.domElement );

        document.addEventListener( 'mousedown', onDocumentMouseDown, false );
        document.addEventListener( 'mousemove', onDocumentMouseMove, false );
        document.addEventListener( 'mouseup', onDocumentMouseUp, false );
        document.addEventListener( 'wheel', onDocumentMouseWheel, false );
        document.addEventListener( 'dblclick', onDocumentDblclick, false );
        window.addEventListener( 'resize', onWindowResize, false );
        console.log("pano_loaded_end");
        console.log(this.panoId);
        depth_loader.load(this.panoId);

    }

    depth_loader.onDepthLoad = function () {
        console.log("depth_loaded_start");
        var canvas = document.createElement("canvas");
        var context = canvas.getContext('2d');
        canvas.setAttribute('width', this.depthMap.width);
        canvas.setAttribute('height', this.depthMap.height);
        var image = context.getImageData(0, 0, this.depthMap.width, this.depthMap.height);
        for (var y = 0; y < this.depthMap.height; ++y) {
            for (var x = this.depthMap.width; x > 0 ; --x) {
                var col = this.depthMap.depthMap[y * this.depthMap.width + x] / 50 * 255;
                image.data[4 * (y * this.depthMap.width + x) + 0] = col;
                image.data[4 * (y * this.depthMap.width + x) + 1] = col;
                image.data[4 * (y * this.depthMap.width + x) + 2] = col;
                image.data[4 * (y * this.depthMap.width + x) + 3] = 255;
            }
        }
        context.putImageData(image, 0, 0);
        var depth_container = document.getElementById('depth_container');
        while (depth_container.firstChild) {
            depth_container.removeChild(depth_container.firstChild);
        }

        depth_container.appendChild(canvas);

        var geometry_click = new THREE.SphereGeometry( 400, 120, 80 );
        geometry_click.scale( 1, 1, 1 );
        
        var depth_texture = new THREE.Texture(canvas);

        material_invisible = new THREE.MeshBasicMaterial( {
            //map: new THREE.TextureLoader().load( 'null.png' ),
            map: depth_texture,
            //color: 0x00ffff, 
            wireframe: true, 
            side: THREE.DoubleSide,
            wireframeLinewidth: 3.0,
            visible: false
        } );

        material_grid = new THREE.MeshBasicMaterial( {
            //map: new THREE.TextureLoader().load( 'null.png' ),
            map: depth_texture,
            //color: 0x00ffff, 
            wireframe: true, 
            side: THREE.DoubleSide,
            wireframeLinewidth: 3.0,
            visible: true
        } );

        material_visible = new THREE.MeshBasicMaterial( {
            //map: new THREE.TextureLoader().load( 'null.png' ),
            alphaMap: depth_texture,
            //color: 0x00ffff, 
            opacity: 1.0,
            transparent: true,
            side: THREE.DoubleSide,
            visible: true
        } );

        depth_texture.needsUpdate = true;
        mesh_click = new THREE.Mesh( geometry_click, material_invisible );
        
        scene.add( mesh_click );

        depth_img = context;

        //Relative position calculation
        relative_positions = [];
        var n = 0;
        for (var y = 0; y < this.depthMap.height; ++y) {
            var lat = (y / this.depthMap.height) * 180.0 - 90.0;
            var r = Math.cos(lat * Math.PI / 180.0);
            var row_positions = [];
            for (var x = this.depthMap.width; x > 0 ; --x) {
                var depth = parseFloat(this.depthMap.depthMap[y * this.depthMap.width + (this.depthMap.width - x)]);
                var lng = (1-(x / this.depthMap.width)) * 360.0 - 180.0;
                var pos = new THREE.Vector3();
                pos.x = (r * Math.cos(lng * Math.PI / 180.0));
                pos.y = (Math.sin(lat * Math.PI / 180.0));
                pos.z = (r * Math.sin(lng * Math.PI / 180.0));
                pos.d = depth;
                pos.multiplyScalar(depth);
                pos.multiplyScalar(2.0);
                row_positions.push(pos);
                n++;
            }
            relative_positions.push(row_positions);
        }

        console.log("depth_loaded_end");

    }

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onDocumentMouseDown( event ) {

    event.preventDefault();

    isUserInteracting = true;

    onPointerDownPointerX = event.clientX;
    onPointerDownPointerY = event.clientY;

    onPointerDownLon = lon;
    onPointerDownLat = lat;

}

function onDocumentDblclick( event ) {
    
    function dist_line (idx1,idx2) {
        var measure_line = new THREE.Line3( measures[idx2].true_point, measures[idx1].true_point );
        var view_line = new THREE.Line3( measures[idx2].view_point, measures[idx1].view_point );
        distances.push(measure_line.distance()*6/9.73);
        var measure_text = new SpriteText2D((measure_line.distance()*6/9.73).toFixed(2), {align: textAlign.right, font: '16px Arial', fillStyle: '#00ff00' });
        measure_text.position.set (view_line.center().x,view_line.center().y,view_line.center().z);
        measure_text.name = "measure_text";
        scene.add(measure_text);
        features.push(measure_text);
        var measure_geom = new THREE.Geometry ();
        measure_geom.vertices.push(measures[idx2].view_point, measures[idx1].view_point);
        measure_line =new THREE.Line( measure_geom, new THREE.LineBasicMaterial({color: 0x00ff00, linewidth:3}));
        measure_line.name = "measure_line";
        scene.add( measure_line );
        features.push(measure_line);
    }

    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
    raycaster.setFromCamera( mouse, camera );
    var intersect = raycaster.intersectObject( mesh_click );
    console.log(intersect[0].point);
    console.log(intersect[0].uv);
    var map_y = Math.round(256-256*intersect[0].uv.y);
    var map_x = Math.round(512*intersect[0].uv.x);
    
    if (relative_positions[map_y][map_x].d < 1000.0) { // check if click point has valid distance, otherwise is in depth map
        var geometry = new THREE.Geometry()
        geometry.vertices.push( new THREE.Vector3(intersect[0].point.x,intersect[0].point.y,intersect[0].point.z));
        var material = new THREE.PointsMaterial( { 
            size: 15, 
            map: new THREE.TextureLoader().load( point1_texture ), 
            sizeAttenuation: false, 
            transparent : true } );
        material.color.setHSL( 1.0, 1.0, 1.0 );
        var puntatore = new THREE.Points( geometry, material );
        scene.add( puntatore );

        var SpriteText2D = THREE_Text.SpriteText2D;
        var textAlign = THREE_Text.textAlign;
        console.log(depth_img.getImageData(map_x, map_y, 1, 1).data);
    
        var depth_txt = depth_img.getImageData(map_x, map_y, 1, 1).data.toString();
        var depth_txt = relative_positions[map_y][map_x].d.toFixed(2).toString();
        var text2 = new SpriteText2D(depth_txt, {align: textAlign.right, font: '12px Arial', fillStyle: '#ff0000' });
        text2.position.set(intersect[0].point.x,intersect[0].point.y,intersect[0].point.z);
        text2.name = "text2";
        scene.add(text2);
        features.push(text2);
        measures.push({true_point:relative_positions[map_y][map_x],view_point:intersect[0].point});
        console.log(measures.length);
    }
    
    if (measures.length > 1) {
        console.log(measures);
        dist_line(measures.length-2, measures.length-1);
    }
    if (measures.length == 4) {
    	dist_line(0, measures.length-1);
        plan_definition = {measures:measures,distances:distances};
        measures = [];
        distances = [];
    }

}

function onDocumentMouseMove( event ) {

    if ( isUserInteracting === true ) {

        lon = ( onPointerDownPointerX - event.clientX ) * 0.1 + onPointerDownLon;
        lat = ( event.clientY - onPointerDownPointerY ) * 0.1 + onPointerDownLat;

    }

}

function onDocumentMouseUp( event ) {

    isUserInteracting = false;

}

function onDocumentMouseWheel( event ) {

    camera.fov += event.deltaY * 0.75;
    camera.updateProjectionMatrix();

}

function animate() {

    requestAnimationFrame( animate );
    update();

}

function update() {

    if ( isUserInteracting === false ) {

        lon += 0;

    }

    if (camera) {
        lat = Math.max( - 85, Math.min( 85, lat ) );
        phi = THREE.Math.degToRad( 90 - lat );
        theta = THREE.Math.degToRad( lon );

        camera.target.x = 500 * Math.sin( phi ) * Math.cos( theta );
        camera.target.y = 500 * Math.cos( phi );
        camera.target.z = 500 * Math.sin( phi ) * Math.sin( theta );

        camera.lookAt( camera.target );

        renderer.render( scene, camera );
    }
}
