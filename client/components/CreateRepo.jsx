import React from "react";
import { getCurrentWorkingDirectory, readDirectory } from "../api/filesystem.js";
import * as path from "path";

import { Octokit } from "octokit";

import { Circles } from "react-loader-spinner";

import "./CreateRepo.css";

export default class CreateRepo extends React.Component {
    constructor(props) {
        super(props);
        this.octokit = new Octokit({
            auth: props.accessToken
        });
        this.state = {
            repoCount: 0,
            repoMap: [],
            displayAddon: false,
            template: "starter",
            createTemplate: false,
            userName: "",
            loadPage: false,
            codespace_url: "",
            new_repo_url: "",
            new_repo_name: "",
            clickToCreateProj: false
        };
        this.orgName = "CodespacesDemoOrg";
        this.repoName = "SampleAddon_4";
        this.listAddonRepositories();
    }

    async listAddonRepositories() {
        var repos = await this.octokit.rest.repos.listForOrg({ org: this.orgName });

        for (const repo of repos.data) {
            try {
                // .wxprc file used to identify add-on project repositories
                await this.octokit.rest.repos.getContent({
                    owner: this.orgName,
                    repo: repo.name,
                    path: ".wxprc"
                });
            } catch (error) {
                // ignore 404 as it is not an add-on project repository
                console.log(`${repo.name} not a add-on project`);
                continue;
            }
            const repoMap = {
                name: repo.name,
                url: repo.html_url
            };
            this.setState({
                repoCount: this.state.repoCount + 1,
                repoMap: [...this.state.repoMap, repoMap]
            });
        }

        const { data } = await this.octokit.request("/user");

        this.setState({
            displayAddon: this.state.repoCount > 0 ? true : false,
            createTemplate: true,
            userName: data.login,
            loadPage: true
        });
    }

    async createGithubRepository() {
        try {
            await this.octokit.rest.repos.delete({
                owner: this.orgName,
                repo: this.repoName
            });
        } catch (error) {
            // ignore 404 error here
            console.log(error);
        }

        const { data } = await this.octokit.rest.repos.createInOrg({
            org: this.orgName,
            name: this.repoName
        });

        this.setState({ new_repo_url: data.html_url, new_repo_name: data.name });

        const cwd = await getCurrentWorkingDirectory();

        console.log(path.join(cwd, "templates", this.state.template));
        const fileDataList = await readDirectory(path.join(cwd, "templates", this.state.template));

        for (const fileData of fileDataList) {
            const fileName = fileData.fileName.slice(
                path.join(cwd, "templates", this.state.template + "/").length
            );
            await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: this.orgName,
                repo: this.repoName,
                path: fileName,
                message: "Add add-on files into project",
                content: fileData.fileContent
            });
        }
    }

    async createGithubCodespace() {
        this.setState({ codespace_url: "", clickToCreateProj: true });

        await this.createGithubRepository();

        const codespace = await this.octokit.rest.codespaces.createWithRepoForAuthenticatedUser({
            owner: this.orgName,
            repo: this.repoName
        });

        const codespace_url = codespace.data.web_url;

        this.setState({ codespace_url: codespace_url, clickToCreateProj: false });

        window.open(codespace_url, "_blank");
    }

    handleTemplateOptionChange(event) {
        this.setState({ template: event.target.value });
    }

    loadAddOn() {
        const index = this.state.codespace_url.indexOf(".");
        const httpsUrl = this.state.codespace_url.slice(0, index) + "-5241.githubpreview.dev";
        const wssUrl = "wss" + httpsUrl.slice(5);
        const AddOnData = {
            httpsUrl: httpsUrl,
            wssUrl: wssUrl,
            addOnId: "starter-addon"
        };
        window.parent.postMessage(AddOnData, "*");
    }

    render() {
        var repos = [];
        for (var i = 0; i < this.state.repoCount; i += 1) {
            repos.push(
                <div id="url">
                    <a href={this.state.repoMap[i].url}>{this.state.repoMap[i].name}</a>
                </div>
            );
        }
        // const loadingStyle = {
        //     position: "relative",
        //     top: "80%",
        //     left: "35%"
        // };

        const createProjLoaderStyle = {
            position: "absolute",
            top: "27%",
            left: "45%"
        };

        const opacity = {
            opacity: this.state.clickToCreateProj ? "0.3" : "1"
        };

        return (
            <div>
                {this.state.loadPage ? (
                    <div id="whole" style={opacity}>
                        {/* <div id="user"> Logged in as {this.state.userName} </div> */}
                        {this.state.displayAddon ? (
                            <div id="list">
                                <h4>List of existing add-on projects</h4>
                                {repos}
                            </div>
                        ) : null}
                        {this.state.createTemplate ? (
                            <div id="template">
                                <h4>Create a new add-on project</h4>
                                <label>Choose a template : </label>
                                <select
                                    onChange={this.handleTemplateOptionChange.bind(this)}
                                    placeholder="Choose a template"
                                >
                                    <option selected>starter</option>
                                    <option>react-starter</option>
                                </select>
                                <button id="create" onClick={this.createGithubCodespace.bind(this)}>
                                    Create Project
                                </button>
                            </div>
                        ) : null}
                        {this.state.codespace_url ? (
                            <div id="resultant-url">
                                <div id="addon-url">
                                    <b>Add-on project created:</b>&nbsp;
                                    <a href={this.state.new_repo_url}>{this.state.new_repo_name}</a>
                                </div>
                                <div id="codespace-url">
                                    <b>Codespace created:</b>&nbsp;
                                    <a href={this.state.codespace_url}>
                                        {this.state.codespace_url}
                                    </a>
                                </div>
                                <button id="load" onClick={this.loadAddOn.bind(this)}>
                                    Load Add-on
                                </button>
                            </div>
                        ) : this.state.clickToCreateProj ? (
                            <Circles
                                height="50"
                                width="50"
                                radius="9"
                                color="black"
                                ariaLabel="loading"
                                wrapperStyle={createProjLoaderStyle}
                            />
                        ) :
                        null}
                    </div>
                ) : (
                    <div>
                        {/* <div id="loading"> Loading... </div> */}
                        <Circles
                            height="50"
                            width="50"
                            radius="9"
                            color="black"
                            ariaLabel="loading"
                            wrapperStyle={createProjLoaderStyle}
                        />
                    </div>
                )}
            </div>
        );
    }
}
