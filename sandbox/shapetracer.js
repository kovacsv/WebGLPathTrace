ShapeTracer = function ()
{
	this.canvas = null;
	this.context = null;
	this.gpuTracer = null;
	this.fragmentShader = null;
	this.settings = null;
	this.model = null;
};

ShapeTracer.prototype.Init = function (canvasElem, controlsElem, fragmentShaderElem)
{
	if (!this.InitUserInterface (controlsElem)) {
		return false;
	}
	
	if (!this.InitRenderer (canvasElem, fragmentShaderElem)) {
		return false;
	}
	
	return true;
};

ShapeTracer.prototype.InitUserInterface = function (controlsElem)
{
	this.settings = {
		light : {
			position : new JSM.Coord (3, 2, 4),
			radius : 0.5
		}
	};	
	
	return true;
};

ShapeTracer.prototype.InitRenderer = function (canvasElem, fragmentShaderElem)
{
	this.canvas = canvasElem;
	this.fragmentShader = fragmentShaderElem.childNodes[0].nodeValue;

	var camera = new JSM.Camera (
		new JSM.Coord (5, 3, 4),
		new JSM.Coord (0, 0, 1),
		new JSM.Coord (0, 0, 1)
	);
	
	var maxIteration = 256;
	var myThis = this;
	
	this.gpuTracer = new GPUTracer ();
	var callbacks = {};
	
	if (!this.gpuTracer.Init (this.canvas, camera, maxIteration, callbacks)) {
		return false;
	}
	
	if (!this.Compile ()) {
		return false;
	}
	
	this.gpuTracer.StartInNormalMode ();	
	return true;
};

ShapeTracer.prototype.Compile = function ()
{
	this.model = {
		room : {
			min : [-5, -5, 0],
			max : [5, 5, 10],
			material : {
				diffuse : [0.6, 0.6, 0.6],
				reflection : 0.0
			}
		},
		spheres : [
			{
				origin : [2.0, 0.0, 1.0],
				radius : 1.0,
				material : {
					diffuse : [0.0, 0.0, 0.7],
					reflection : 0.0
				}
			},
			{
				origin : [0.0, 2.0, 1.0],
				radius : 1.0,
				material : {
					diffuse : [0.0, 0.7, 0.0],
					reflection : 0.0
				}
			}
		],
		boxes : [
			{
				min : [-1, -1, 0],
				max : [1, 1, 2],
				material : {
					diffuse : [0.7, 0.0, 0.0],
					reflection : 0.0
				}
			}
		]
	};
	
	var timer = new JSM.Timer ();
	timer.Start ();
	var defines = [
		'#define SPHERE_COUNT ' + this.model.spheres.length,
		'#define BOX_COUNT ' + this.model.boxes.length
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

ShapeTracer.prototype.UpdateUniforms = function ()
{
	this.gpuTracer.GetNavigation ().SetNearDistanceLimit (1.0);
	this.gpuTracer.GetNavigation ().SetFarDistanceLimit (20.0);
	this.gpuTracer.SetUniformVector ('uLightPosition', [this.settings.light.position.x, this.settings.light.position.y, this.settings.light.position.z]);
	this.gpuTracer.SetUniformFloat ('uLightRadius', this.settings.light.radius);

	this.gpuTracer.SetUniformVector ('uRoomBox.min', this.model.room.min);
	this.gpuTracer.SetUniformVector ('uRoomBox.max', this.model.room.max);
	this.gpuTracer.SetUniformVector ('uRoomBox.material.diffuse', this.model.room.material.diffuse);
	this.gpuTracer.SetUniformFloat ('uRoomBox.material.reflection', this.model.room.material.reflection);

	var i;
	for (i = 0; i < this.model.spheres.length; i++) {
		this.gpuTracer.SetUniformVector ('uSpheres[' + i + '].origin', this.model.spheres[i].origin);
		this.gpuTracer.SetUniformFloat ('uSpheres[' + i + '].radius', this.model.spheres[i].radius);
		this.gpuTracer.SetUniformVector ('uSpheres[' + i + '].material.diffuse', this.model.spheres[i].material.diffuse);
		this.gpuTracer.SetUniformFloat ('uSpheres[' + i + '].material.reflection', this.model.spheres[i].material.reflection);
	}
	for (i = 0; i < this.model.boxes.length; i++) {
		this.gpuTracer.SetUniformVector ('uBoxes[' + i + '].min', this.model.boxes[i].min);
		this.gpuTracer.SetUniformVector ('uBoxes[' + i + '].max', this.model.boxes[i].max);
		this.gpuTracer.SetUniformVector ('uBoxes[' + i + '].material.diffuse', this.model.boxes[i].material.diffuse);
		this.gpuTracer.SetUniformFloat ('uBoxes[' + i + '].material.reflection', this.model.boxes[i].material.reflection);
	}
	
	return true;
};
