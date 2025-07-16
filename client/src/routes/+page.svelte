<div class="main">
	<div class="spacer" style="height:70px; width: 100%;"></div>
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
		flex-direction: column;
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
		top: 200px;
		left: 50%;
		transform: translate(-50%, -50%);
		backdrop-filter: blur(10);
		color: var(--color-capa-white);
		font-family: 'eurostile', sans-serif;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	/* @media (max-width: 1000px) {
		.title {
			font-size: 3em;
		}
	} */

	@media (max-width: 700px) {
		.title {
			font-size: 3em;
		}
	}

	.homeImg {
		width: 100%;
		height: 500px;
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
		filter: sepia(100%) hue-rotate(320deg) blur(3px);
		opacity: 30%;
	}
	.infocard {
		position: absolute;
		top: 440px;
		right: 10px;
		color: white;
		font-size: 1.2em;
		z-index: 2;
		border-radius: 25px;
		padding: 10px;
		background: rgba(0, 0, 0, 0.1);
	}
</style>
