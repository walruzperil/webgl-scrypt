function initializeGl() {
    canvas = document.createElement('canvas');
    if (debug || true) document.body.appendChild(canvas)
    canvas.height = 1;
    canvas.width = threads;

    var names = [ "webgl", "experimental-webgl", "moz-webgl", "webkit-3d" ],
        gl = null;

    for(var i in names) {
        try {
            gl = canvas.getContext(names[i], {preserveDrawingBuffer: true});
            if (gl) { break; }
        } catch (e) { }
    }

    if (!gl) {
        throw "Your browser doesn't support WebGL";
    }

    gl.clearColor ( 1.0, 1.0, 1.0, 1.0 );
    gl.clear ( gl.COLOR_BUFFER_BIT );
    gl.viewport(0, 0, canvas.width, canvas.height);

    return gl;
}

function loadResource(n) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", n, false);
    xhr.send(null);
    var x = xhr.responseText;
    return x;
};

function setupShaders(gl) {
    var program = gl.createProgram(),
        vShader = gl.createShader(gl.VERTEX_SHADER),
        vShaderSource = loadResource("shader-vs.js"),
        fShader = gl.createShader(gl.FRAGMENT_SHADER),
        fShaderSource = loadResource("shader-fs.js");

    gl.shaderSource(vShader, vShaderSource);
    gl.compileShader(vShader);
    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(vShader);
    }
    gl.attachShader(program, vShader);

    gl.shaderSource(fShader, fShaderSource);
    gl.compileShader(fShader);
    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(fShader);
    }
    gl.attachShader(program, fShader);

    gl.linkProgram(program);
    gl.useProgram(program);
//
    var vertices = new Float32Array([
        1, 1,
       -1, 1,
        1,-1,
       -1,-1
    ]), //Square to cover whole canvas
        vertexPositionLoc = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(vertexPositionLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.vertexAttribPointer(vertexPositionLoc, 2, gl.FLOAT, false, 0, 0);

    return {
        header: gl.getUniformLocation(program, "header"),
        nonce: gl.getUniformLocation(program, "base_nonce")
    };
}
$(function() {
    var gl = initializeGl();
    var locations = setupShaders(gl);

    console.log("Headers is " + header);
    var header_bin = ___.hex_to_uint16_array(header);
    gl.uniform2fv(locations.header, header_bin);

    console.log("Nonce is " + nonce);
    var nonce_bin = ___.hex_to_uint8_array(nonce.toString(16));
    gl.uniform2fv(locations.nonce, nonce_bin);
    console.log(nonce_bin);

    //Fill nonce to header_bin. Convert byte order
    header_bin[38] = (nonce_bin[3]*256) + nonce_bin[2];
    header_bin[39] = (nonce_bin[1]*256) + nonce_bin[0];

    console.log("Input is " + header_bin);

    padded_header_bin = ___.hex_to_uint16_array("02000000ff1fd715a981626682fd8d73afda09d825722d6ba5f665b1be6ed400242f7b650c3623c0f087fefdeefcd4c84d916a511551425fabaf52d55d5596498ba5f869f139d55346e2021b00039bfc800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280");
    console.log("Padded input is " + padded_header_bin);

    var buf = new Uint8Array(threads * 1 * 4);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.readPixels(0, 0, threads, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);

    var result = [];
    for(var i = 0; i < 127; i+=2) {
        result.push((buf[i]*256) + buf[i+1]);
    }

    console.log("Result is " + result);

    var matched = (function() {
        for(var i = 0; i < padded_header_bin.length; i++) {
            if( result[i] != padded_header_bin[i] ) {
                return false;
            }
        }
        return true;
    })();
    console.log(matched ? "Matched" : "Don't matched");
});
