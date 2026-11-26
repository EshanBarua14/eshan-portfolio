// Hero "signal field": slow domain-warped flow + perspective data grid.
#define DEBUG_MODE 0
const float FLOW_SCALE = 1.35;
const float FLOW_SPEED = 0.035;
const float WARP = 1.6;
const vec3  COL_DEEP = vec3(0.020, 0.028, 0.040);
const vec3  COL_TEAL = vec3(0.000, 0.780, 0.640);
const vec3  COL_BLUE = vec3(0.180, 0.420, 1.000);
const float GRID_STRENGTH = 0.55;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float t = iTime * FLOW_SPEED;

    vec2 q, r;
    float f = warpedFbm(uv * FLOW_SCALE + vec2(t, -t * 0.6), WARP, 4, q, r);
    f = 0.5 + 0.5 * f;

    vec3 deep = srgbToLinear(COL_DEEP);
    vec3 teal = srgbToLinear(COL_TEAL);
    vec3 blue = srgbToLinear(COL_BLUE);

    // filaments: thin bright bands where the warp field folds
    float band = 1.0 - abs(fract(f * 6.0 + t * 2.0) - 0.5) * 2.0;
    band = pow(clamp(band, 0.0, 1.0), 18.0);
    vec3 col = deep;
    col += mix(blue, teal, clamp(length(r), 0.0, 1.0)) * (0.09 * f * f + 0.38 * band * f);

    // perspective floor grid in the lower half
    float horizon = -0.15;
    float yy = horizon - uv.y;
    if (yy > 0.0) {
        float z = 0.6 / yy;
        vec2 g = vec2(uv.x * z, z + iTime * 0.25);
        vec2 gw = abs(fract(g) - 0.5);
        vec2 px = vec2(2.0 / iResolution.y) * vec2(z, z * z / 0.6);
        vec2 line = 1.0 - smoothstep(vec2(0.0), px * 1.5, gw - 0.0);
        float grid = max(line.x, line.y) * exp(-z * 0.12);
        col += teal * grid * GRID_STRENGTH * smoothstep(0.0, 0.25, yy);
    }

    // vignette keeps text side calm
    float v = 1.0 - smoothstep(0.3, 1.9, length(uv * vec2(0.8, 1.0)));
    col *= 0.35 + 0.65 * v;

    col = tonemapAgX(col * 1.6);
    col = linearToSrgb(col);
#if DEBUG_MODE == 1
    col = vec3(f);
#elif DEBUG_MODE == 5
    col = vec3(band);
#endif
    col += ditherTPDF(fragCoord, iFrame);
    fragColor = vec4(col, 1.0);
}
