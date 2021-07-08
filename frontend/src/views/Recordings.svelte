<div>
	<h1>Camera: { params.camName }</h1>
	<div class="recordings-list">
		{#each recordings as recording}
			<div class="list-item">
				<p>{formatUnixTime(recording.start)}</p>
				<Button variant="raised" on:click={viewRecording(recording.name)}><Label>View</Label></Button>
			</div>
		{/each}
	</div>
</div>
<div bind:this={videoPopup} class='backdrop' style="display: none;">
	<video bind:this={videoPlayer} controls></video>
</div>

<script lang="ts">
	import moment, { HTML5_FMT } from 'moment';
	import config from '../config/config';
	import Button, { Label } from '@smui/button';
	import type Recording from '../models/Recording';

	export let params;

	let videoPlayer: HTMLVideoElement;
	let videoPopup: HTMLDivElement;
	let recordings: Recording[] = [];

	refreshRecordingList();

	async function refreshRecordingList() {
		const response = await fetch(`${config.API}/recordings/list/${params.camName}`);
		const obj = await response.json();
		recordings = obj.recordings;
	}

	function viewRecording(recordingName: string) {
		videoPlayer.src = `${config.API}/recordings/get/${params.camName}/${recordingName}`;
		videoPopup.style.display = videoPopup.style.display === 'none' ? 'flex' : 'none';
	}

	function formatUnixTime(timestamp: string) {
		return moment(timestamp, 'x').format('dddd, MMMM Do YYYY, h:mm:ss a');
	}
</script>

<style type="text/scss" scoped>
	.recordings-list {
		display: flex;
		flex-direction: column;

		.list-item {
			display: flex;
			justify-content: space-between;
			align-items: center;
			width: 500px;
		}
	}

	.backdrop {
		justify-content: center;
		align-items: center;

		video {
			min-width: 50%;
			max-width: 90%;
			max-height: 100%;
		}
	}
</style>