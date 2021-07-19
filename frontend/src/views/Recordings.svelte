<div class="container">
	<h1>Camera: { params.camName }</h1>
	<div class="recordings-grid">
		{#each recordings as recording}
			<div class="grid-item">
				<!-- <video src="{recording.src}" poster="{recording.img}" preload="none" controls></video> -->
				<img src="{recording.img}" alt="recording thumbnail">
				<div class="video-details">
					<p>{formatUnixTime(recording.start)}</p>
					<Button variant="raised" on:click={viewRecording(recording)}><Label>View</Label></Button>
				</div>
			</div>
		{/each}
	</div>
</div>
<div bind:this={videoPopup} class='backdrop' style="display: none;">
	<div bind:this={popupContainer} class="popup-container">
		<!-- svelte-ignore a11y-media-has-caption -->
		<video bind:this={videoPlayer} width="100%" height="100%" preload="none" controls loop></video>
	</div>
</div>

<script lang="ts">
	import moment, { HTML5_FMT } from 'moment';
	import config from '../config/config';
	import Button, { Label } from '@smui/button';
	import type Recording from '../models/Recording';
	import { onMount } from 'svelte';
	import IconButton from '@smui/icon-button';

	export let params;

	let videoPlayer: HTMLVideoElement;
	let videoPopup: HTMLDivElement;
	let popupContainer: HTMLDivElement;
	let recordings: Recording[] = [];

	onMount(() => {
		refreshRecordingList();
		videoPopup.addEventListener('click', () => hidePopup());
		popupContainer.addEventListener('click', () => hidePopup());
		videoPopup.children[0].addEventListener('click', (e) => e.stopPropagation());
	});

	async function refreshRecordingList() {
		const response = await fetch(`${config.API}/recordings/list/${params.camName}`);
		const obj = await response.json();
		recordings = obj.recordings;
	}

	function viewRecording(recording: Recording) {
		videoPlayer.poster = recording.img;
		videoPlayer.src = recording.src;
		showPopup();
	}

	function formatUnixTime(timestamp: string) {
		return moment(timestamp, 'x').format('dddd, MMMM Do YYYY, h:mm:ss a');
	}

	function showPopup() {
		videoPopup.style.display = 'flex';
	}

	function hidePopup() {
		videoPopup.style.display = 'none';
	}
</script>

<style type="text/scss" scoped>
	:global(body), :global(html) {
		overflow: hidden;
	}

	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;

		.recordings-grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			width: min(95vw, 1500px);
			overflow-y: auto;
			gap: 50px;
	
			.grid-item {
				display: flex;
				flex-direction: column;

				img {
					flex: 1;
					width: 100%;
				}

				.video-details {
					display: flex;
					align-items: center;
					justify-content: space-between;
				}
			}
		}
	}

	.backdrop {
		position: fixed;
		justify-content: center;
		align-items: center;
		width: 100vw;
		height: 100vh;

		.popup-container {
			display: flex;
			justify-content: center;

			video {
				min-width: 50%;
				max-width: 90%;
				max-height: 100%;
			}
		}
	}
</style>