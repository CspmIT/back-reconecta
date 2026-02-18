const { getAllBinnacles, saveBinnacle, updateStatusToDeleted } = require('../services/BinnacleService')

const listBinnacle = async (req, res) => {
    try {
        const filters = req.params
        const binnacles = await getAllBinnacles(filters)
        return res.status(200).json(binnacles)
    } catch (e) {
        return res.status(500).json({ message: e.message })
    }
}

const addBinnacle = async (req, res) => {
    try {
        const binnacle = req.body
        const data = await saveBinnacle(binnacle)
        return res.status(200).json({ message: 'Equipo creado correctamente', data })
    } catch (e) {
        return res.status(500).json({ message: e.message })
    }
}

const updateBinnacle = async (req, res) => {
    try {
        const { id } = req.params;
        const binnacleData = req.body;

        const binnacles = await getAllBinnacles({ id });
        const binnacle = binnacles.length ? binnacles[0] : null;

        if (!binnacle) {
            return res.status(404).json({ message: 'Registro no encontrado' });
        }
        delete binnacleData.order;
        await binnacle.update(binnacleData);
        return res.status(200).json({ message: 'Registro actualizado correctamente', data: binnacle });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
};


const deleteBinnacle = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedBinnacle = await updateStatusToDeleted(id);

        return res.status(200).json({
            message: 'Registro marcado como eliminado',
            data: updatedBinnacle
        });
    } catch (e) {
        return res.status(500).json({ message: e.message });
    }
}

module.exports = {
    listBinnacle,
    addBinnacle,
    updateBinnacle,
    deleteBinnacle,
}