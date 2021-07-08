<main>
	<Navbar on:addCamera={addCamera}></Navbar>
	<div class="container">
		{#each cameras as camera}
			<CameraPreview camera={camera} on:deleteCamera={deleteCamera}></CameraPreview>
		{/each}
	</div>
</main>

<script lang="ts">
	import CameraPreview from '../components/CameraPreview.svelte';
	import Navbar from '../components/Navbar.svelte';
	import config from '../config/config';
	import type Camera from '../models/Camera';

	let cameras: Camera[] = [];

	refreshCameraList();

	async function refreshCameraList() {
		const response = await fetch(`${config.API}/camera/get-all`);
		const obj = await response.json();
		cameras = obj.cameras;
	}

	async function addCamera(event) {
		const response = await fetch(`${config.API}/camera/create`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(event.detail)
		});
		const obj = await response.json();

		if (obj.status == 'success') {
			cameras = [...cameras, obj.camera];
		}
		else {
			console.log(obj);
		}
	}

	async function deleteCamera(event) {
		const response = await fetch(`${config.API}/camera/delete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(event.detail)
		});
		const obj = await response.json();

		if (obj.status == 'success') {
			refreshCameraList();
		}
		else {
			console.log(obj);
		}
	}
</script>

<style type="text/scss" scoped>
	@use "../theme/_smui-theme";

	main {
		display: flex;
		flex-direction: column;
		padding: 0;
		margin: 0;
	}

	.container {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		margin: 0 20px;
		gap: 20px;
	}
</style>