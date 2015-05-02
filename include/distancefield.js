DistanceField = function ()
{
	this.gpuTracer = null;
	this.fragmentShader = null;
	this.settings = null;
};

DistanceField.prototype.Init = function (controlsElem, fragmentShaderElem)
{
	if (!this.InitUserInterface (controlsElem)) {
		return false;
	}
	
	if (!this.InitRenderer (fragmentShaderElem)) {
		return false;
	}
	
	return true;
};

DistanceField.prototype.InitUserInterface = function (controlsElem)
{
	function AddShapeParameters (controlsElem, shapeData, name, myThis)
	{
		var mainElem = null;
		UserInterface.AddTitle (controlsElem, name + ' shape');
		mainElem = UserInterface.AddMainElem (controlsElem);
		UserInterface.AddSelectControl (mainElem, 'type', ['off', 'sphere', 'cube', 'cylinder', 'torus'], shapeData.type, function (index) {
			shapeData.type = index;
			myThis.Compile ();
			myThis.StartRender (false);
		});		
		UserInterface.AddSliderControl (mainElem, 'x position', UserInterface.ToSlider (shapeData.position[0], -5.0, 5.0), function (ratio) {
			shapeData.position[0] = UserInterface.FromSlider (ratio, -5.0, 5.0);
			myThis.UpdateUniforms ();
			myThis.StartRender (true);
		});
		UserInterface.AddSliderControl (mainElem, 'y position', UserInterface.ToSlider (shapeData.position[1], -5.0, 5.0), function (ratio) {
			shapeData.position[1] = UserInterface.FromSlider (ratio, -5.0, 5.0);
			myThis.UpdateUniforms ();
			myThis.StartRender (true);
		});
		UserInterface.AddSliderControl (mainElem, 'z position', UserInterface.ToSlider (shapeData.position[2], 0.0, 3.0), function (ratio) {
			shapeData.position[2] = UserInterface.FromSlider (ratio, 0.0, 3.0);
			myThis.UpdateUniforms ();
			myThis.StartRender (true);
		});
		UserInterface.AddSliderControl (mainElem, 'size 1', UserInterface.ToSlider (shapeData.size[0], 0.2, 2.0), function (ratio) {
			shapeData.size[0] = UserInterface.FromSlider (ratio, 0.2, 2.0);
			myThis.UpdateUniforms ();
			myThis.StartRender (true);
		});
		UserInterface.AddSliderControl (mainElem, 'size 2', UserInterface.ToSlider (shapeData.size[1], 0.2, 2.0), function (ratio) {
			shapeData.size[1] = UserInterface.FromSlider (ratio, 0.2, 2.0);
			myThis.UpdateUniforms ();
			myThis.StartRender (true);
		});
		UserInterface.AddSliderControl (mainElem, 'size 3', UserInterface.ToSlider (shapeData.size[2], 0.2, 2.0), function (ratio) {
			shapeData.size[2] = UserInterface.FromSlider (ratio, 0.2, 2.0);
			myThis.UpdateUniforms ();
			myThis.StartRender (true);
		});
	}

	this.settings = {
		shape1 : {
			type : 1,
			position : [0.0, 0.0, 1.0],
			size : [1.0, 1.0, 1.0]
		},
		shape2 : {
			type : 2,
			position : [1.0, 0.0, 1.5],
			size : [0.6, 0.6, 0.6]
		},
		operation : 2,
		light : {
			rotation : Math.PI / 8.0,
			distance : 10.0,
			height : 8.0,
			radius : 0.5
		}
	};
	
	var myThis = this;
	var mainElem = null;

	AddShapeParameters (controlsElem, this.settings.shape1, 'first', this);
	AddShapeParameters (controlsElem, this.settings.shape2, 'second', this);
	
	UserInterface.AddTitle (controlsElem, 'light position');
	mainElem = UserInterface.AddMainElem (controlsElem);
	UserInterface.AddSliderControl (mainElem, 'rotation', UserInterface.ToSlider (this.settings.light.rotation, 0.0, 2.0 * Math.PI), function (ratio) {
		myThis.settings.light.rotation = UserInterface.FromSlider (ratio, 0.0, 2.0 * Math.PI);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});
	UserInterface.AddSliderControl (mainElem, 'distance', UserInterface.ToSlider (myThis.settings.light.distance, 5.0, 15.0), function (ratio) {
		myThis.settings.light.distance = UserInterface.FromSlider (ratio, 5.0, 15.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});	
	UserInterface.AddSliderControl (mainElem, 'height', UserInterface.ToSlider (myThis.settings.light.height, 5.0, 15.0), function (ratio) {
		myThis.settings.light.height = UserInterface.FromSlider (ratio, 5.0, 15.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});	
    UserInterface.AddSliderControl (mainElem, 'radius', UserInterface.ToSlider (myThis.settings.light.radius, 0.0, 1.0), function (ratio) {
		myThis.settings.light.radius = UserInterface.FromSlider (ratio, 0.0, 1.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});
    
	UserInterface.AddTitle (controlsElem, 'operation');
	mainElem = UserInterface.AddMainElem (controlsElem);
	UserInterface.AddSelectControl (mainElem, 'type', ['union', 'difference', 'intersection'], 1, function (index) {
		myThis.settings.operation = index + 1;
		myThis.Compile ();
		myThis.StartRender (false);
	});
	return true;
};

DistanceField.prototype.InitRenderer = function (fragmentShaderElem)
{
	this.fragmentShader = fragmentShaderElem.childNodes[0].nodeValue;

	this.gpuTracer = new GPUTracer ();
	var canvas = document.getElementById ('example');
	
	var camera = new JSM.Camera (
		new JSM.Coord (4, -1, 2),
		new JSM.Coord (0, 0, 1),
		new JSM.Coord (0, 0, 1)
	);
	
	var maxIteration = 256;
	if (!this.gpuTracer.Init (canvas, camera, maxIteration)) {
		return false;
	}
	if (!this.Compile ()) {
		return false;
	}
	if (!this.UpdateUniforms ()) {
		return false;
	}
	this.StartRender (false);
	return true;
};

DistanceField.prototype.Compile = function ()
{
	var timer = new JSM.Timer ();
	timer.Start ();
	var defines = [
		'#define SHAPETYPE1 ' + this.settings.shape1.type,
		'#define SHAPETYPE2 ' + this.settings.shape2.type,
		'#define OPERATION ' + this.settings.operation
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

DistanceField.prototype.UpdateUniforms = function ()
{
	function GetLightPosition (lightData)
	{
		var origo = new JSM.Coord2D (0.0, 0.0);
		var lightPosition = JSM.CoordRotate2D (new JSM.Coord2D (1.0, 0.0), lightData.rotation, origo);
		lightPosition = JSM.VectorSetLength2D (lightPosition, lightData.distance);
		return new JSM.Coord (lightPosition.x, lightPosition.y, lightData.height);
	}
	
	this.gpuTracer.GetNavigation ().SetNearDistanceLimit (1.0);
	this.gpuTracer.GetNavigation ().SetFarDistanceLimit (20.0);
	var lightPosition = GetLightPosition (this.settings.light);
	this.gpuTracer.SetUniformVector ('uLightPosition', [lightPosition.x, lightPosition.y, lightPosition.z]);
	this.gpuTracer.SetUniformFloat ('uLightRadius', this.settings.light.radius);
	this.gpuTracer.SetUniformArray ('uShapeData1', [this.settings.shape1.position[0], this.settings.shape1.position[1], this.settings.shape1.position[2], this.settings.shape1.size[0], this.settings.shape1.size[1], this.settings.shape1.size[2]]);
	this.gpuTracer.SetUniformArray ('uShapeData2', [this.settings.shape2.position[0], this.settings.shape2.position[1], this.settings.shape2.position[2], this.settings.shape2.size[0], this.settings.shape2.size[1], this.settings.shape2.size[2]]);
	return true;
};

DistanceField.prototype.StartRender = function (isPreviewMode)
{
	if (isPreviewMode) {
		this.gpuTracer.StartInPreviewMode ();
	} else {
		this.gpuTracer.StartInNormalMode ();
	}
};
