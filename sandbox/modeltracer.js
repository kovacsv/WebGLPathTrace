ModelTracer = function ()
{
	this.canvas = null;
	this.context = null;
	this.gpuTracer = null;
	this.fragmentShader = null;
	this.model = null;
	this.settings = null;
	//this.tileSize = null;
	//this.tileStart = null;
};

ModelTracer.prototype.Init = function (canvasElem, controlsElem, fragmentShaderElem)
{
	if (!this.InitUserInterface (controlsElem)) {
		return false;
	}
	
	if (!this.InitRenderer (canvasElem, fragmentShaderElem)) {
		return false;
	}
	
	return true;
};

ModelTracer.prototype.InitUserInterface = function (controlsElem)
{
	this.settings = {
		light : {
			position : new JSM.Coord (4.0, 2.0, 3.0),
			radius : 0.5
		}
	};	
	
	return true;
};

ModelTracer.prototype.InitRenderer = function (canvasElem, fragmentShaderElem)
{
	this.canvas = canvasElem;
	this.fragmentShader = fragmentShaderElem.childNodes[0].nodeValue;

	var camera = new JSM.Camera (
		new JSM.Coord (4, 1, 2),
		new JSM.Coord (0, 0, 0),
		new JSM.Coord (0, 0, 1)
	);
	
	var maxIteration = 256;
	var myThis = this;
	
	this.gpuTracer = new GPUTracer ();
	var callbacks = {
		//renderFinished : myThis.TileFinished.bind (this)
	};
	
	if (!this.gpuTracer.Init (this.canvas, camera, maxIteration, callbacks)) {
		return false;
	}
	
	if (!this.Compile ()) {
		return false;
	}
	
	if (!this.UpdateUniforms ()) {
		return false;
	}
	
	//this.tileSize = 0.2;
	//this.tileStart = [0.0, 0.0];
	//this.RenderTile (this.tile);
	this.StartRender (false);
	return true;
};

ModelTracer.prototype.Compile = function ()
{
	this.model = this.GetModel ();
	
	var timer = new JSM.Timer ();
	timer.Start ();
	var defines = [
		'#define TRIANGLE_COUNT ' + this.model.TriangleCount ()
	].join ('\n');
	var result = this.gpuTracer.Compile (defines + this.fragmentShader, function (error) {
		console.log (error);
	});
	if (!result) {
		return false;
	}
	if (!this.UpdateUniforms ()) {
		return false;
	}
	timer.Stop ();
	console.log ('Compile time: ' + timer.Result ());
	return true;
};

ModelTracer.prototype.UpdateUniforms = function ()
{
	function GenerateTriangleData (model)
	{
		var result = [];
		var i, j, body, triangle, v0, v1, v2, n0, n1, n2;
		for (i = 0; i < model.BodyCount (); i++) {
			body = model.GetBody (i);
			for (j = 0; j < body.TriangleCount (); j++) {
				triangle = body.GetTriangle (j);
				v0 = body.GetVertex (triangle.v0);
				v1 = body.GetVertex (triangle.v1);
				v2 = body.GetVertex (triangle.v2);
				n0 = body.GetNormal (triangle.n0);
				n1 = body.GetNormal (triangle.n1);
				n2 = body.GetNormal (triangle.n2);
				result.push (v0.x, v0.y, v0.z);
				result.push (v1.x, v1.y, v1.z);
				result.push (v2.x, v2.y, v2.z);
				result.push (n0.x, n0.y, n0.z);
				result.push (n1.x, n1.y, n1.z);
				result.push (n2.x, n2.y, n2.z);
				result.push (triangle.mat, 0.0, 0.0);
			}
		}
		return result;
	}
	
	function GenerateMaterialData (model)
	{
		var result = [];
		var i, material;
		for (i = 0; i < model.MaterialCount (); i++) {
			material = model.GetMaterial (i);
			result.push (material.diffuse[0], material.diffuse[1], material.diffuse[2]);
			result.push (material.reflection, 0.0, 0.0);
		}
		return result;
	}

	this.gpuTracer.GetNavigation ().SetNearDistanceLimit (1.0);
	this.gpuTracer.GetNavigation ().SetFarDistanceLimit (20.0);
	this.gpuTracer.SetUniformVector ('uLightPosition', [this.settings.light.position.x, this.settings.light.position.y, this.settings.light.position.z]);
	this.gpuTracer.SetUniformFloat ('uLightRadius', this.settings.light.radius);
	
	var triangleData = GenerateTriangleData (this.model);
	this.gpuTracer.AddTextureBuffer (triangleData, 'TriangleTexture');
	var materialData = GenerateMaterialData (this.model);
	this.gpuTracer.AddTextureBuffer (materialData, 'MaterialTexture');	
	
	return true;
};

ModelTracer.prototype.GetModel = function ()
{
	var model = new JSM.Model ();
	var materials = new JSM.Materials ();
	materials.AddMaterial (new JSM.Material ({diffuse : 0xaaaaaa}));
	materials.AddMaterial (new JSM.Material ({diffuse : 0x00aa00}));
	materials.AddMaterial (new JSM.Material ({diffuse : 0x0000aa}));
	materials.AddMaterial (new JSM.Material ({diffuse : 0xaa0000, reflection : 0.2}));
	
	var body = JSM.GenerateCuboid (1, 1, 1);
	body.SetPolygonsMaterialIndex (1);
	body.Transform (JSM.RotationZTransformation (-0.35));
	body.Transform (JSM.TranslationTransformation (new JSM.Coord (-0.2, 1.2, 0.0)));
	model.AddBody (body);

	var body2 = JSM.GenerateCuboid (0.5, 0.5, 0.5);
	body2.SetPolygonsMaterialIndex (2);
	body2.Transform (JSM.TranslationTransformation (new JSM.Coord (1.2, 0.0, -0.25)));
	model.AddBody (body2);

	var body3 = JSM.GenerateCuboid (3, 0.1, 2);
	var body3 = JSM.GenerateCylinder (0.8, 2.0, 25, true, true);
	//var body3 = JSM.GenerateTorus (1.0, 0.3, 20, 20, true);
	body3.SetPolygonsMaterialIndex (3);
	body3.Transform (JSM.TranslationTransformation (new JSM.Coord (0.0, -0.7, 0.5)));
	body3.Transform (JSM.RotationZTransformation (-0.3));
	model.AddBody (body3);

	var box = JSM.GenerateCuboid (10, 10, 10);
	box.SetPolygonsMaterialIndex (0);
	JSM.MakeBodyInsideOut (box);
	box.Transform (JSM.TranslationTransformation (new JSM.Coord (0.0, 0.0, 4.5)));
	model.AddBody (box);
	
	return JSM.ConvertModelToTriangleModel (model, materials);
};

//ModelTracer.prototype.TileFinished = function ()
//{
//	if (JSM.IsLower (this.tileStart[0], 1.0 - this.tileSize)) {
//		this.tileStart[0] += this.tileSize;
//		this.RenderTile (false);
//	} else if (JSM.IsLower (this.tileStart[1], 1.0 - this.tileSize)) {
//		this.tileStart[0] = 0.0;
//		this.tileStart[1] += this.tileSize;
//		this.RenderTile (false);
//	} else {
//		this.tileStart[0] = 0.0;
//		this.tileStart[1] = 0.0;
//	}
//}
//
//ModelTracer.prototype.RenderTile = function ()
//{
//	var tile = [this.tileStart[0], this.tileStart[1], this.tileStart[0] + this.tileSize, this.tileStart[1] + this.tileSize];
//	this.gpuTracer.SetUniformArray ('uTileData', tile);
//	this.StartRender (false);
//}

ModelTracer.prototype.StartRender = function (isPreviewMode)
{
	if (isPreviewMode) {
		this.gpuTracer.StartInPreviewMode ();
	} else {
		this.gpuTracer.StartInNormalMode ();
	}
};
