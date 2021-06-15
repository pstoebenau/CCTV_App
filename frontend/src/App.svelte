<main>
	<div class="container">
		<div class="img-container">
			<div class="canvas-overlay">
				<canvas bind:this={canvas} width="1920" height="1080"></canvas>
				<img bind:this={imgEl} src="http://192.168.1.5:8080/?action=stream" alt="stream" crossorigin="Anonymous"/>
			</div>
		</div>
		<div class="controls">
			<Button variant='raised'>
				<Label>On</Label>
			</Button>
			<Button variant='raised'>
				<Label>Off</Label>
			</Button>
		</div>
	</div>
</main>

<script lang="ts">
	import Button, { Label } from '@smui/button';
	import { onMount } from 'svelte';
	import * as tf from '@tensorflow/tfjs';
	import cocoSsd, { ObjectDetection, DetectedObject } from "@tensorflow-models/coco-ssd";
	// import * as faceapi from 'face-api.js';

	let imgEl: HTMLImageElement;
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let model: ObjectDetection;

	onMount(async () => {
		ctx = canvas.getContext('2d');

		await loadModels();

		setInterval(updatePredictions, 1000);
	});

	async function loadModels() {
		// Load model
		model = await cocoSsd.load()
	}

	async function updatePredictions() {
		// Person detection
		const detections = await model.detect(imgEl);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawBoxes(detections);
	}

	function drawBoxes(detections: DetectedObject[]) {
		for (let object of detections) {
			if (object.class == "person") {
				let scale = imgEl.naturalWidth / imgEl.width;
				const bbox = object.bbox.map(x => x * scale);
				ctx.beginPath();
				ctx.rect(bbox[0], bbox[1], bbox[2], bbox[3]);
				ctx.stroke();
				ctx.closePath();
			}
		}
	}
</script>

<style type="text/scss">
	main {
		padding: 0;
		margin: 0;
	}

	.container {
		display: grid;
		grid-template-columns: 9fr 1fr;
		grid-template-rows: 100vh;
		justify-content: space-around;
		align-items: center;
		height: 100vh;

		.img-container {
			align-self: stretch;
			display: flex;
			align-items: center;
			
			.canvas-overlay {
				position: relative;
				height: fit-content;
			
				img, canvas {
					max-width: 100%;
					max-height: 100%;
					object-fit: contain;
				}

				canvas {
					position: absolute;
					top: 0;
					left: 0;
					z-index: 99;
				}
			}
		}

		.controls {
			display: flex;
			justify-content: space-around;
			flex-direction: column;
			align-self: stretch;
			padding: 0 20px;
		}
	}

</style>