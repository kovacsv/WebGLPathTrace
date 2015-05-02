Mandelbulb = function ()
{
	this.gpuTracer = null;
	this.fragmentShader = null;
	this.settings = null;
};

Mandelbulb.prototype.Init = function (canvasElem, controlsElem, fragmentShaderElem)
{
	if (!this.InitUserInterface (controlsElem)) {
		return false;
	}
	
	if (!this.InitRenderer (canvasElem, fragmentShaderElem)) {
		return false;
	}
	
	return true;
};

Mandelbulb.prototype.InitUserInterface = function (controlsElem)
{
	this.settings = {
		shape : {
			power : 8.0
		},
		light : {
			rotation : Math.PI / 8.0,
			distance : 10.0,
			height : 8.0,
			radius : 0.5
		}
	};
		
	var myThis = this;
	var mainElem = null;
	
	UserInterface.AddTitle (controlsElem, 'shape parameters');
	mainElem = UserInterface.AddMainElem (controlsElem);
	UserInterface.AddSliderControl (mainElem, 'power', UserInterface.ToSlider (this.settings.shape.power, 5.0, 20.0), function (ratio) {
		myThis.settings.shape.power = UserInterface.FromSlider (ratio, 5.0, 20.0);
		myThis.UpdateUniforms ();
		myThis.StartRender (true);		
	});
	
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
    
	return true;
};

Mandelbulb.prototype.InitRenderer = function (canvasElem, fragmentShaderElem)
{
	this.fragmentShader = fragmentShaderElem.childNodes[0].nodeValue;

	var camera = new JSM.Camera (
		new JSM.Coord (2, 0.5, 1),
		new JSM.Coord (0, 0, 0),
		new JSM.Coord (0, 0, 1)
	);
	
	var maxIteration = 16;
	this.gpuTracer = new GPUTracer ();
	if (!this.gpuTracer.Init (canvasElem, camera, maxIteration)) {
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

Mandelbulb.prototype.Compile = function ()
{
	var timer = new JSM.Timer ();
	timer.Start ();
	var result = this.gpuTracer.Compile (this.fragmentShader, function (error) {
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

Mandelbulb.prototype.UpdateUniforms = function ()
{
	function GetLightPosition (lightData)
	{
		var origo = new JSM.Coord2D (0.0, 0.0);
		var lightPosition = JSM.CoordRotate2D (new JSM.Coord2D (1.0, 0.0), lightData.rotation, origo);
		lightPosition = JSM.VectorSetLength2D (lightPosition, lightData.distance);
		return new JSM.Coord (lightPosition.x, lightPosition.y, lightData.height);
	}
	
	this.gpuTracer.GetNavigation ().SetNearDistanceLimit (1.0);
	this.gpuTracer.GetNavigation ().SetFarDistanceLimit (3.0);
	var lightPosition = GetLightPosition (this.settings.light);
	this.gpuTracer.SetUniformVector ('uLightPosition', [lightPosition.x, lightPosition.y, lightPosition.z]);
	this.gpuTracer.SetUniformFloat ('uLightRadius', this.settings.light.radius);
	this.gpuTracer.SetUniformFloat ('uPower', this.settings.shape.power);
	return true;
};

Mandelbulb.prototype.StartRender = function (isPreviewMode)
{
	if (isPreviewMode) {
		this.gpuTracer.StartInPreviewMode ();
	} else {
		this.gpuTracer.StartInNormalMode ();
	}
};
