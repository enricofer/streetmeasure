// For any third party dependencies, like jQuery, place them in the lib folder.

// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'lib',
    paths: {
        app: '../scripts'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['scripts/index']);
requirejs(['scripts/utils']);
requirejs(['scripts/CanvasText']);
requirejs(['scripts/Text2D']);
requirejs(['scripts/MeshText2D']);
requirejs(['scripts/PlaneText2D']);
requirejs(['scripts/SpriteText2D']);
