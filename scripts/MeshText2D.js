"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var THREE = require("three");
var Text2D_1 = require("./Text2D");
var MeshText2D = (function (_super) {
    __extends(MeshText2D, _super);
    function MeshText2D(text, options) {
        if (text === void 0) { text = ''; }
        if (options === void 0) { options = {}; }
        _super.call(this, text, options);
    }
    MeshText2D.prototype.raycast = function () {
        this.mesh.raycast.apply(this.mesh, arguments);
    };
    MeshText2D.prototype.updateText = function () {
        this.cleanUp(); // cleanup previous texture
        this.canvas.drawText(this._text, {
            font: this._font,
            fillStyle: this._fillStyle
        });
        this.texture = new THREE.Texture(this.canvas.canvas);
        this.texture.needsUpdate = true;
        this.applyAntiAlias();
        if (!this.material) {
            this.material = new THREE.MeshBasicMaterial({ map: this.texture, side: this.side });
            this.material.transparent = true;
        }
        else {
            this.material.map = this.texture;
        }
        if (!this.mesh) {
            this.geometry = new THREE.PlaneGeometry(this.canvas.width, this.canvas.height);
            this.mesh = new THREE.Mesh(this.geometry, this.material);
            this.add(this.mesh);
        }
        this.mesh.position.x = ((this.canvas.width / 2) - (this.canvas.textWidth / 2)) + ((this.canvas.textWidth / 2) * this.align.x);
        this.mesh.position.y = (-this.canvas.height / 2) + ((this.canvas.textHeight / 2) * this.align.y);
        // manually update geometry vertices
        this.geometry.vertices[0].x = this.geometry.vertices[2].x = -this.canvas.width / 2;
        this.geometry.vertices[1].x = this.geometry.vertices[3].x = this.canvas.width / 2;
        this.geometry.vertices[0].y = this.geometry.vertices[1].y = this.canvas.height / 2;
        this.geometry.vertices[2].y = this.geometry.vertices[3].y = -this.canvas.height / 2;
        this.geometry.verticesNeedUpdate = true;
    };
    return MeshText2D;
}(Text2D_1.Text2D));
exports.MeshText2D = MeshText2D;
