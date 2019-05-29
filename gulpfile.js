const gulp       = require('gulp');
const gulpif     = require('gulp-if');

const clean      = require('gulp-clean');
const debug      = require('gulp-debug');
const sourcemaps = require("gulp-sourcemaps");
const rename     = require("gulp-rename");
const replace    = require("gulp-replace");
const plumber    = require("gulp-plumber");
const uglify     = require('gulp-uglify');

// html
const pug = require('gulp-pug');

// css
const sass       = require("gulp-sass");
const mqpacker   = require("css-mqpacker");
const sortCSSmq  = require("sort-css-media-queries");
const mincss     = require("gulp-clean-css");
const autoprefixer = require("gulp-autoprefixer");
const postcss    = require("gulp-postcss");

// img
const imagemin         = require("gulp-imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminZopfli   = require("imagemin-zopfli");
const imageminMozjpeg  = require("imagemin-mozjpeg");
const imageminGiflossy = require("imagemin-giflossy");
const imageminWebp     = require("imagemin-webp");
const webp             = require("gulp-webp");
const favicons         = require("gulp-favicons");

// js
const webpack       = require('webpack');
const webpackStream = require('webpack-stream');

// live reload
const browserSync = require('browser-sync').create();
const reload      = browserSync.reload;

const yargs = require('yargs');
const production = !!yargs.argv.production;


// -------------------------------- paths ----------------------------
const paths = {
	views: {
			src: "./src/views/index.pug",
			dist: "./dist/",
			watch: "./src/views/**/*.pug"
		},
	styles: {
			src: "./src/styles/main.scss",
			dist: "./dist/css/",
			watch: "src/styles/**/*.scss"
		},
	images: {
			src: [
				"./src/img/**/*.{jpg,jpeg,png,gif,svg}",
				"!./src/img/svg/*.svg",
				"!./src/img/favicon.{jpg,jpeg,png,gif}"
			],
			dist: "./dist/img/",
			watch: "./src/img/**/*.{jpg,jpeg,png,gif,svg}"
		},
	scripts: {
			src: "./src/js/main.js",
			dist: "./dist/js/",
			watch: "./src/js/**/*.js"
		},
	webp: {
			src: "./src/img/**/*_webp.{jpg,jpeg,png}",
			dist: "./dist/img/",
			watch: "./src/img/**/*_webp.{jpg,jpeg,png}"
		},
	favicons: {
			src: "./src/img/favicon.{jpg,jpeg,png,gif}",
			dist: "./dist/img/favicons/",
		},		
	statfile: {
		src: ["./src/static/**/*.*", "./src/static/**/.*"],
		dist: "./dist/",
		watch: "./src/static/**/*"
	},		
};

// ------------------------- webpack ---------------------------
var webpackConfig = {
	output: {
        filename: "[name].js",
      },
      module: {
        rules: [
          {
            test: /\.(js)$/,
            exclude: /node_modules/,
			use: {
				loader: 'babel-loader',
				query: {
				  presets: ["@babel/preset-env"]
				}
			}
          },
		]
      },
	  plugins: [
		  new webpack.ProvidePlugin({
			'$': 'jquery',
			'jQuery': 'jquery',
			'window.jQuery': 'jquery'
		  }),
        ]
};
webpackConfig.mode = production ? "production" : "development";
webpackConfig.devtool = production ? false : "cheap-eval-source-map";


// --------------------------- task ------------------------------------
function cleanFiles() {
    return gulp.src("./dist/*", {read: false})
        .pipe(clean())
		.pipe(debug({"title": "Cleaning..."}));

};	

function serve() {
    browserSync.init({
        server: {
            baseDir: "./dist/",
			port: 4000,
			notify: true
        }
    });
	
	gulp.watch(paths.views.watch, views);
	gulp.watch(paths.styles.watch, styles);
	gulp.watch(paths.images.watch, images);
	gulp.watch(paths.webp.watch, webpimages);
	gulp.watch(paths.scripts.watch, scripts);
	gulp.watch(paths.statfile.watch, statfile);
	//gulp.watch("*.html").on("change", reload);
};

function views() {
	return gulp.src(paths.views.src)
	.pipe(pug({
		pretty: true
	}))
	.pipe(gulpif(production, replace("main.css", "main.min.css")))
	.pipe(gulpif(production, replace("main.js", "main.min.js")))
	.pipe(gulp.dest(paths.views.dist))
	.pipe(debug({
		"title": "Views"
	}))
	.pipe(browserSync.stream());
};

function styles() {
	return gulp.src(paths.styles.src)
	.pipe(gulpif(!production, sourcemaps.init()))
	.pipe(plumber())
	.pipe(sass())
	.pipe(postcss([
		mqpacker({
			sort: sortCSSmq
		}),
	]))
	.pipe(
		autoprefixer({
			browsers: ["last 12 versions", "> 1%"]
		})
	)
	.pipe(gulpif(production, mincss({
		compatibility: '*', // Internet Explorer 10+ compatibility mode
		})
	))
	.pipe(gulpif(production, rename({
		suffix: ".min"
	})))
	.pipe(plumber.stop())
	.pipe(gulpif(!production, sourcemaps.write("./maps/")))
	.pipe(gulp.dest(paths.styles.dist))
	.pipe(debug({
		"title": "CSS files"
	}))
	.pipe(browserSync.stream());
}


 function images() {
	return gulp
		.src(paths.images.src)
		.pipe(gulpif(production, imagemin([
			imageminGiflossy({
				optimizationLevel: 3,
				optimize: 3,
				lossy: 2
			}),
			imageminPngquant({
				speed: 5,
				quality: [0.7, 0.8]
			}),
			imageminZopfli({
				more: true
			}),
			imageminMozjpeg({
				progressive: true,
				quality: 70
			}),
			imagemin.svgo({
				plugins: [
					{ removeViewBox: false },
					{ removeUnusedNS: false },
					{ removeUselessStrokeAndFill: false },
					{ cleanupIDs: false },
					{ removeComments: true },
					{ removeEmptyAttrs: true },
					{ removeEmptyText: true },
					{ collapseGroups: true }
				]
			})
		])))
		.pipe(gulp.dest(paths.images.dist))
		.pipe(debug({
			"title": "Images"
		}))
		.pipe(browserSync.stream());
 }
 
 function webpimages() {
	return gulp.src(paths.webp.src)
	.pipe(webp(gulpif(production, imageminWebp({
		lossless: true,
		quality: 90,
		alphaQuality: 90
	}))))
	.pipe(gulp.dest(paths.webp.dist))
	.pipe(debug({
		"title": "WebP images"
	}));
}

function favs() {
	return gulp.src(paths.favicons.src)
	.pipe(favicons({
		icons: {
			appleIcon: true,
			favicons: true,
			online: false,
			appleStartup: false,
			android: false,
			firefox: false,
			yandex: false,
			windows: false,
			coast: false
		}
	}))
	.pipe(gulp.dest(paths.favicons.dist))
	.pipe(debug({
		"title": "Favicons"
	}));
}

function scripts() {
  return gulp.src(paths.scripts.src)
    .pipe(webpackStream(webpackConfig))
    .pipe(gulp.dest(paths.scripts.dist))
    .pipe(gulpif(production, uglify()))
    .pipe(gulpif(production, rename({
		suffix: ".min"
	})))
    .pipe(gulp.dest(paths.scripts.dist));
};

function statfile() {
	return gulp.src(paths.statfile.src)
	.pipe(gulp.dest(paths.statfile.dist))
	.pipe(debug({
		"title": "Copy file"
	}));
};

gulp.task('default', 
	gulp.series(cleanFiles, 
	gulp.parallel(statfile, views, styles, scripts, images, webpimages, favs),
	gulp.parallel(serve))
);

gulp.task('prod',
    gulp.series(cleanFiles, 
		gulp.series(statfile, views, styles, scripts, images, webpimages, favs)
));

	