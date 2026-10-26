export function programaGpu(gl: WebGLRenderingContext, vertex: string, fragment: string) {
  const shaders: WebGLShader[] = [];
  const programa = gl.createProgram();
  if (!programa) throw new Error('Não foi possível iniciar o desenho do mapa.');
  try {
    for (const [tipo, fonte] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(tipo);
      if (!shader) throw new Error('Não foi possível preparar o desenho do mapa.');
      shaders.push(shader);
      gl.shaderSource(shader, fonte);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Falha no shader.');
      gl.attachShader(programa, shader);
    }
    gl.linkProgram(programa);
    if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa) || 'Falha ao ligar o shader.');
    return { programa, liberar() { gl.deleteProgram(programa); for (const shader of shaders) gl.deleteShader(shader); } };
  } catch (erro) {
    gl.deleteProgram(programa);
    for (const shader of shaders) gl.deleteShader(shader);
    throw erro;
  }
}

export function limparAtributos(gl: WebGLRenderingContext) {
  // As camadas compartilham o contexto; cada uma assume seus próprios atributos.
  for (let i = 0; i < 8; i++) gl.disableVertexAttribArray(i);
}
