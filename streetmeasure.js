
var raycaster = new THREE.Raycaster(); 
var mouse = new THREE.Vector2();
var pano_map;
var depth_img, loaded;
var relative_positions;
var mesh, mesh_click;
var fx_image;
var tracker_map,tracker_marker;
var textureLoader = new THREE.TextureLoader();
var point_parameter = [
        [ 0xffffff, textureLoader.load("sprites/marker_1.png"), 10 ]
    ];
var point1_texture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwQAADsEBuJFr7QAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTFH80I3AAACZ0lEQVRYR8VXLXTCMBDOHBJZOYlETiInkchJJBKJQyKRlZOTk5NIJHJyEokbu8tfv1zSNinwtvfyVtrL3Xc/+e7ydL1e1b/+MYDspVRFcN9+ldrT+hKrpt8r+v6crY+dzxEmxa9sTItnLJI9MdAc3d0AlJqWGJbgGAiD7wLSDkCpOW2+JJQe6N2G1kysNcl/tOxZtYFIA+DwiVCT4h29q3rDqtSI5BjMGXVw3aT2xgDIc7Hxm35Pew3LYlZqTEY5Wlg3a6knBGBy7sNu8z8uNu7AUDRIRy0cWqC+AAAJH50wPbPnw41DREjXJ+j9oeeRA9EAgNDbKEwGe55OBxt26dhEADBfuuBKCCpHNnZQR8FEgNnLorPe91d7jlEhYwnKRWHuAVgK1R90vgYoz9lDurfgaI0A3uFDK2nkGOmUMeTlHD0hAOT52c2G2iJompkDcEEAfORcbu5X/QkggqrHugjpJR6RonZaGi1B0ZUDgJT5yBRwn2io2R1D7mLwIauPl3puj/skYFoAEB2PQQZ6jm/quLsUvARc/Tge8KeNwCwbJowL8f5p4JYetmbNtr4ZifAEHese6cA60882ytgNuXf744hCNwOgCUn0Gj/gyHlgKcLk2+ZQEOTIQgwk29aBxJLSTmyocYAoAgKe+0YHw0hQA6gYJxi78Uj/8wnKjHbILdxlWUc0YcVDqZkPolnOAjnYYo37RXNrCgzbfXz8kuNdGoDjATNeR3cDKKiznR0bek2P834GlCnsBmCiUZGRvSjOVoMAjiPhq72tdvoBNNFwF9MoxGCUL6xFF9R8ACl6NrPkTfPDH/6l79TQbkNBAAAAAElFTkSuQmCC';
var point2_texture = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABp0RVh0U29mdHdhcmUAUGFpbnQuTkVUIHYzLjUuMTFH80I3AAAAPklEQVQ4T2P8//8/A0UAZAAlmCLNYNdTYvtQMADkQ7AvcQc07jCAaSZgCA0NADmbIi8QmcCGfTogIhwoDgMAP03EWexlQvAAAAAASUVORK5CYII=';
var req_pano_id = gup('panoid');
var req_lon = gup('lon');
var req_lat = gup('lat');
var gsv = new google.maps.StreetViewService();
var pid;
var gui = new dat.GUI();


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


function png2depth_map(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = function(e) {
        if (this.status === 200) {
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
        logging: true,
        useCORS: true,
        allowTaint:true,
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

function straighten_view () {

    for (i=0; i<features.length; ++i){
        scene.remove(features[i]);
    };
    features = [];
    update();

    var extract_canvas = document.getElementById("container").firstChild; //cloneCanvas(T_canvas);

    //compute transformations
    var transf_array = []
    var trans_padding_factor = 0.2;
    var out_width = extract_canvas.offsetWidth;
    var out_height = extract_canvas.offsetHeight;
    var trans_axis_x = out_width*(1-trans_padding_factor*2);
    var trans_axis_y = out_height*(1-trans_padding_factor*2);

    // assuming ortho transformed input so calculating mean distance
    var mean_dist0 = (plan_definition.distances[0]+plan_definition.distances[2])/2;
    var mean_dist1 = (plan_definition.distances[1]+plan_definition.distances[3])/2;

    //trasform coordinates assuming screen x > screen y = landscape screen
    if (mean_dist0>mean_dist1){ 
        var max_axis = trans_axis_x;
        var min_axis = mean_dist1*max_axis/mean_dist0;

        var trans_bl = [out_width/2-max_axis/2,out_height/2+min_axis/2];
        var trans_br = [out_width/2+max_axis/2,out_height/2+min_axis/2];
        var trans_tl = [out_width/2-max_axis/2,out_height/2-min_axis/2];
        var trans_tr = [out_width/2+max_axis/2,out_height/2-min_axis/2];

    } else {
        var max_axis = trans_axis_y;
        var min_axis = mean_dist0*max_axis/mean_dist1;

        var trans_bl = [out_width/2-min_axis/2,out_height/2+max_axis/2];
        var trans_br = [out_width/2+min_axis/2,out_height/2+max_axis/2];
        var trans_tl = [out_width/2-min_axis/2,out_height/2-max_axis/2];
        var trans_tr = [out_width/2+min_axis/2,out_height/2-max_axis/2];
    }

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
            res.push(parseInt(array[i][0]));
            res.push(parseInt(array[i][1]));
        }
        return res;
    };

    fx_canvas = fx.canvas();

    var fx_texture = fx_canvas.texture(extract_canvas);

    //glfx.js do the magic
    console.log(serialize_point_array(source_array), serialize_point_array(dest_array))
    fx_canvas.draw(fx_texture).perspective(serialize_point_array(source_array), serialize_point_array(dest_array)).update();

    var pattern_container = document.getElementById('pattern_container');
    var overlay_container = document.getElementById('overlay_container');
    pattern_container = document.getElementById('pattern_container');
    while (pattern_container.firstChild) {
        pattern_container.removeChild(pattern_container.firstChild);
    };
    pattern_container.appendChild(fx_canvas);
    
    overlay_container.className = "show";
    container.className = "hide";
    
    fx_image = fx_canvas.toDataURL('image/png')

    /*
    link = document.createElement('a');
    document.body.appendChild(link);
    link.href = fx_canvas.toDataURL('image/png');
    link.download = 'projection.png';
    link.click();  */  
    
}


function init() {

    $('#boxclose').click(function(event){
        event.stopPropagation();
        event.preventDefault();
        var overlay_container = document.getElementById('overlay_container');
        overlay_container.className = "hide";
        var main_container = document.getElementById("container")
        main_container.className = "show";
    });

    $('#boxsave').click(function(event){
        event.stopPropagation();
        event.preventDefault();
        link = document.createElement('a');
        document.body.appendChild(link);
        link.href = fx_image;
        link.download = 'projection.png';
        link.click();   
    });

    $('#tracker_map').mousedown(function(event){
        event.stopPropagation();
    });

    $('#tracker_map').dblclick(function(event){
        event.stopPropagation();
    });

    $('#pattern_container').click(function(event){
        event.stopPropagation();
        event.preventDefault();
    });
    
    console.log (req_pano_id,parseFloat(req_lat), parseFloat(req_lon));

    var tracker_map_options = {
        disableDoubleClickZoom: true,
        draggable: true,
        scrollwheel: true,
        panControl: false,
        disableDefaultUI: true,
        zoom: 17
    };
    tracker_map = new google.maps.Map(document.getElementById('tracker_map'), tracker_map_options);
    tracker_marker =  new google.maps.Marker({map: tracker_map});

    var streetViewLayer = new google.maps.StreetViewCoverageLayer();
    streetViewLayer.setMap(tracker_map);
    google.maps.event.addListener(tracker_map, "dblclick", function (ev) { 
        gsv.getPanoramaByLocation( ev.latLng, 50, 
            function (data, status) {
                if (status === google.maps.StreetViewStatus.OK) {
                    console.log(data);
                    build_pano(data.location.pano);
                } else {
                    console.error("Unable to get location");
                };
        })
        event.preventDefault();
    });
    google.maps.event.addListener(tracker_map, "click", function (ev) { 
        event.preventDefault();
    });

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
    this.check_tracker_map = true;
    gui.add(this, "check_tracker_map", true).name("Show tracker map").onChange(function (value) {
        if (value)
            document.getElementById("tracker_map").className = "show";
        else
            document.getElementById("tracker_map").className = "hide";
    });
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
    gui.add(this, "straighten_view").name("straighten panorama view");

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
                tracker_map.setCenter({
                    lat: data.location.latLng.lat(),
                    lng: data.location.latLng.lng()
                });
                tracker_marker.setPosition(data.location.latLng);
                
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
        var material2 = new THREE.PointsMaterial( { 
            size: 16, 
            map: new THREE.TextureLoader().load( point2_texture ), 
            sizeAttenuation: false, 
            transparent : true } );
        material2.color.setHSL( 1.0, 1.0, 1.0 );
        var material1 = new THREE.PointsMaterial( { 
            size: 32, 
            map: new THREE.TextureLoader().load( point1_texture ), 
            sizeAttenuation: false, 
            transparent : true } );
        material2.color.setHSL( 1.0, 1.0, 1.0 );
        var puntatore1 = new THREE.Points( geometry, material1 );
        var puntatore2 = new THREE.Points( geometry, material2 );
        scene.add( puntatore1 );
        scene.add( puntatore2 );
        features.push(puntatore1);

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
