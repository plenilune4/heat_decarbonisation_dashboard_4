import { Helmet } from 'react-helmet'

const HelmetWrapper = ({ title, description }) => {
    return (
        <Helmet>
            <title>{title}</title>
            <meta name='description' content={description} />
            <meta name='viewport' content='width=device-width, initial-scale=1' />
        </Helmet>
    )
}

export default HelmetWrapper
