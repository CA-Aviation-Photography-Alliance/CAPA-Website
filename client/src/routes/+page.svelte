<div class="main">
	<div class="home">
		<div class="title">California Aviation Photography Alliance</div>
		<img class="homeImg" src="homescreen-dabyt.jpg" alt="Home screen image" />
		<div class="infocard">Photo by @Barlius</div>
	</div>
</div>
<div class="about"></div>

<style>
	.main {
		height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.about {
		height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.home {
		position: relative;
		text-align: center;
		height: 90%;
		width: 100%;
	}

	.title {
		width: 100%;
		font-size: 5em;
		z-index: 1;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		backdrop-filter: blur(10);
		color: white;
	}

	.homeImg {
		width: 100%;
		height: 100%;
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		filter: sepia(100%) hue-rotate(160deg) blur(3px);
		opacity: 30%;
	}
	.infocard {
		position: absolute;
		bottom: 10px;
		right: 10px;
		color: white;
		font-size: 1.2em;
		z-index: 2;
		border-radius: 25px;
		padding: 10px;
		background: rgba(0, 0, 0, 0.1);
	}
</style>
