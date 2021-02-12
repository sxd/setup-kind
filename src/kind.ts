import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as path from 'path';
import * as os from 'os';

const VersionInput: string = "version";
const ConfigInput: string = "config";
const ImageInput: string = "image";
const NameInput: string = "name";
const WaitInput: string = "wait";
const SkipClusterCreationInput: string = "skipClusterCreation";

const toolName: string = "kind";

export class KindConfig {
    version: string
    configFile: string;
    image: string;
    name: string;
    waitDuration: string;
    skipClusterCreation: boolean
    constructor(version: string, configFile: string, image: string, name: string, waitDuration: string, skipClusterCreation: string) {
        this.version = version;
        this.configFile = configFile;
        this.image = image;
        this.name = name;
        this.waitDuration = waitDuration;
        this.skipClusterCreation = (skipClusterCreation == 'true');
    }

    // returns the arguments to pass to `kind create cluster`
    getCommand(): string[] {
        let args: string[] = ["create", "cluster"];
        if (this.configFile != "") {
            const wd: string = process.env[`GITHUB_WORKSPACE`] || "";
            const absPath: string = path.join(wd, this.configFile);
            args.push("--config", absPath);
        }
        if (this.image != "") {
            args.push("--image", this.image);
        }
        if (this.name != "") {
            args.push("--name", this.name);
        }
        if (this.waitDuration != "") {
            args.push("--wait", this.waitDuration);
        }

        return args;
    }

    async createCluster() {
        if (this.skipClusterCreation)
            return;

        console.log("Executing kind with args " + this.getCommand());
        await exec.exec("kind", this.getCommand());
    }
}

export function getKindConfig(): KindConfig {
    const v: string = core.getInput(VersionInput);
    const c: string = core.getInput(ConfigInput);
    const i: string = core.getInput(ImageInput);
    const n: string = core.getInput(NameInput);
    const w: string = core.getInput(WaitInput);
    const s: string = core.getInput(SkipClusterCreationInput);

    return new KindConfig(v, c, i, n, w, s);
}

// this action should always be run from a Linux worker
export async function downloadKind(version: string, arch: string): Promise<string> {
    let url: string = `https://github.com/kubernetes-sigs/kind/releases/download/${version}/kind-linux-${arch}`;
    console.log("downloading kind from " + url);
    let downloadPath: string | null = null;
    downloadPath = await tc.downloadTool(url);
    await exec.exec("chmod", ["+x", downloadPath]);
    let toolPath: string = await tc.cacheFile(downloadPath, "kind", toolName, version);
    core.debug(`kind is cached under ${toolPath}`);

    return toolPath;
}

export async function getKind(version: string): Promise<string> {
  let toolPath: string = tc.find(toolName, version);
  let arch: string;

  switch (os.arch()) {
    case 'x64': {
      arch = 'amd64';
      break;
    }
    case 'ppc64': {
      arch = 'ppc64le';
      break;
    }
    case 'arm': {
      arch = 'arm64';
      break;
    }
    default: {
      arch = os.arch();
      break;
    }
  }


  if (toolPath === "") {
      toolPath = await downloadKind(version, arch);
  }

  return toolPath;
}
