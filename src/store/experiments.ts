import { defineStore } from 'pinia'
const Datastore = require('nedb');
import path from 'path'
import ExperiemntObj from '../objects/experiment'
export const useExperimentsStore = defineStore('experiments', {
    state: () => {
        return {
            current_project_id: -1,
            project_config_list: [],
            opened_project: new Array<ExperiemntObj>(),
        }
    },
    persist: true,
    actions: {
        async loadProject() {
            this.opened_project = new Array<ExperiemntObj>()
            let fs = require("fs")
            let util = require('util')
            let count = 0
            for (let i of this.project_config_list) {
                let exists =  await util.promisify(fs.exists)(i)
                if (exists) {
                    const db = new Datastore({ filename: i, autoload: true })
                    db.find({}, async (err, docs) => {
                        if (!err) {
                            let current_exp = docs[0] as ExperiemntObj
                            let capture =  await util.promisify(fs.exists)(path.join(i,'..', 'video.mkv'))
                            current_exp.record_state=capture
                            this.opened_project.push(docs[0])
                        } else {
                            console.log("project database load error", i)
                        }
                    })
                }
                count++
            }
            console.log("load finish")

        },
        async addProject(payload: ExperiemntObj) {
            this.project_config_list.push(path.join(payload.folder_path, 'project.json'))
            const db = new Datastore({ filename: path.join(payload.folder_path, 'project.json'), autoload: true })
            await db.insert(payload, (err,newDoc)=> {
                this.opened_project.push(newDoc)
            })
        },
        async updateProject(payload: ExperiemntObj) {
            const db = new Datastore({ filename: path.join(payload.folder_path, 'project.json'), autoload: true })
            await db.update({_id: payload._id},payload, (err,newDoc) => {
                console.log('update', newDoc)
            })
        },
        closeProject() {
            this.opened_project = null
        },
        get_from_id(idx: string) {
            console.log(idx)
            return this.opened_project.find(element => element._id == idx)
        }

    }
})
export default useExperimentsStore