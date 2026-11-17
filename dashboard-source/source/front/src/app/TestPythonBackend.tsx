import Button from '@/components/Button'
import {api} from "@/services/api.service";
import ROUTES from "@/ROUTES";

export default function TestPythonBackend() {

    return (<Button
        onClick={() => api(ROUTES.app.optimiseDHNlayout,
            {
                param1: 1,
                param2: 20,
                param3: 30,
                param4: 40,
            })}
    >

    </Button>)
}